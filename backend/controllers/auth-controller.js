const crypto = require('crypto');
const validator = require('validator');
const ErrorHandler = require('../utils/error-handler');
const userService = require('../services/user-service');
const tokenService = require('../services/token-service');
const otpService = require('../services/otp-service');
const mailService = require('../services/mail-service');
const InvitationModel = require('../models/invitation-model');
const UserDto = require('../dtos/user-dto');
const { generateEmployeeId } = require('../utils/id-generator');

// ── Cookie Configuration ───────────────────────────────────────
const cookieSameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax');
const isSecureCookie = cookieSameSite === 'none' || process.env.NODE_ENV === 'production';
const baseCookieOptions = { httpOnly: true, sameSite: cookieSameSite, secure: isSecureCookie, path: '/' };

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
const OTP_COOLDOWN_MS = 60 * 1000;
const authCookieOptions = { ...baseCookieOptions, maxAge: THIRTY_DAYS_MS };

// ── Helpers ────────────────────────────────────────────────────
const buildTokenPayload = (user) => ({
    _id: user._id,
    email: user.email,
    username: user.username,
    name: user.name,
    type: user.type
});

const setAuthCookies = async (res, user) => {
    const payload = buildTokenPayload(user);
    const { accessToken, refreshToken } = tokenService.generateToken(payload);
    await tokenService.storeRefreshToken(user._id, refreshToken);
    res.cookie('accessToken', accessToken, authCookieOptions);
    res.cookie('refreshToken', refreshToken, authCookieOptions);
    return { accessToken, refreshToken };
};

const clearAuthCookies = (res) => {
    res.clearCookie('refreshToken', baseCookieOptions);
    res.clearCookie('accessToken', baseCookieOptions);
};

const checkOtpCooldown = async (userId, type) => {
    const existingOtp = await otpService.getOtp(userId, type);
    if (!existingOtp) return null;

    const elapsed = Date.now() - new Date(existingOtp.createdAt).getTime();
    if (elapsed < OTP_COOLDOWN_MS) {
        const secondsLeft = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
        return `Please wait ${secondsLeft} seconds before requesting a new OTP.`;
    }
    return null;
};

const sendPasswordResetOtp = async (userId, name, email) => {
    const type = process.env.TYPE_FORGOT_PASSWORD || 2;
    await otpService.removeOtp(userId);
    const otp = otpService.generateOtp();
    await otpService.storeOtp(userId, otp, type);
    await mailService.sendForgotPasswordMail(name, email, otp);
};

// ── Controller ─────────────────────────────────────────────────
class AuthController {

    login = async (req, res, next) => {
        try {
            const { email, emailOrUsername, password } = req.body;
            const identifier = (emailOrUsername || email || '').trim();

            if (!identifier || !password) return next(ErrorHandler.badRequest('Email and Password are required'));

            const user = validator.isEmail(identifier)
                ? await userService.findUser({ email: identifier.toLowerCase() })
                : await userService.findUser({ username: identifier });

            if (!user) return next(ErrorHandler.badRequest('Invalid Email or Username'));
            if (user.status === 'banned') return next(ErrorHandler.badRequest('Your account has been banned'));

            const isValid = await userService.verifyPassword(password, user.password);
            if (!isValid) return next(ErrorHandler.badRequest('Invalid Password'));

            await setAuthCookies(res, user);

            user.status = 'active';
            await user.save();

            res.json({ success: true, message: 'Login Successful', user: new UserDto(user) });
        } catch (error) {
            next(error);
        }
    }

    forgotPassword = async (req, res, next) => {
        try {
            const { email } = req.body;
            if (!email || !validator.isEmail(email)) return next(ErrorHandler.badRequest('Invalid Email Address'));

            const user = await userService.findUser({ email: email.toLowerCase() });
            if (!user) return res.json({ success: false, message: 'No Account Found' });

            const type = process.env.TYPE_FORGOT_PASSWORD || 2;
            const cooldownMessage = await checkOtpCooldown(user._id, type);
            if (cooldownMessage) return res.json({ success: false, message: cooldownMessage });

            await sendPasswordResetOtp(user._id, user.name, user.email);
            res.json({ success: true, message: 'OTP has been sent to your email address.' });
        } catch (error) {
            next(error);
        }
    }

    resetPassword = async (req, res, next) => {
        try {
            const { email, otp, password } = req.body;
            if (!email || !otp || !password) return next(ErrorHandler.badRequest('Email, OTP, and Password are required'));

            const user = await userService.findUser({ email: email.toLowerCase() });
            if (!user) return next(ErrorHandler.notFound('No Account Found'));

            const type = process.env.TYPE_FORGOT_PASSWORD || 2;
            const response = await otpService.verifyOtp(user._id, otp, type);

            if (response === 'INVALID') return next(ErrorHandler.badRequest('Invalid OTP'));

            if (response === 'EXPIRED') {
                const cooldownMessage = await checkOtpCooldown(user._id, type);
                if (cooldownMessage) return res.json({ success: false, message: `OTP expired. ${cooldownMessage}` });

                await sendPasswordResetOtp(user._id, user.name, user.email);
                return res.json({ success: false, message: 'Your OTP has expired. A new OTP has been sent to your email.' });
            }

            const { modifiedCount } = await userService.updatePassword(user._id, password);
            if (modifiedCount !== 1) return next(ErrorHandler.serverError('Failed to reset your password'));

            res.json({ success: true, message: 'Password has been reset successfully' });
        } catch (error) {
            next(error);
        }
    }

    logout = async (req, res, next) => {
        try {
            const { refreshToken } = req.cookies;
            const { _id } = req.user;

            const { modifiedCount } = await tokenService.removeRefreshToken(_id, refreshToken);
            await userService.updateUser(_id, { status: 'deactive' });

            clearAuthCookies(res);

            return modifiedCount === 1
                ? res.json({ success: true, message: 'Logout Successfully' })
                : next(ErrorHandler.unauthorized());
        } catch (error) {
            next(error);
        }
    }

    refreshToken = async (req, res, next) => {
        try {
            const { refreshToken: oldRefreshToken } = req.cookies;
            if (!oldRefreshToken) return res.status(401).json({ success: false, message: 'Unauthorized Access' });

            const userData = await tokenService.verifyRefreshToken(oldRefreshToken);
            const token = await tokenService.findRefreshToken(userData._id, oldRefreshToken);

            if (!token) {
                clearAuthCookies(res);
                return res.status(401).json({ success: false, message: 'Unauthorized Access' });
            }

            const user = await userService.findUser({ email: userData.email });
            if (!user) {
                clearAuthCookies(res);
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            if (user.status === 'banned') return next(ErrorHandler.unauthorized('Your account has been banned'));

            const payload = buildTokenPayload(user);
            const { accessToken, refreshToken } = tokenService.generateToken(payload);
            await tokenService.updateRefreshToken(user._id, oldRefreshToken, refreshToken);

            res.cookie('accessToken', accessToken, authCookieOptions);
            res.cookie('refreshToken', refreshToken, authCookieOptions);

            user.status = 'active';
            await user.save();

            res.json({ success: true, message: 'Secure access has been granted', user: new UserDto(user) });
        } catch (error) {
            next(error);
        }
    }

    registerInvited = async (req, res, next) => {
        try {
            const {
                token, name, password, mobile, fatherName, motherName,
                presentAddress, permanentAddress, nid, bloodGroup
            } = req.body;

            if (!token || !name || !password || !mobile) {
                return next(ErrorHandler.badRequest('Required fields are missing'));
            }

            const invitation = await InvitationModel.findOne({ token, status: 'pending' });
            if (!invitation) return next(ErrorHandler.badRequest('Invalid or expired invitation'));

            if (new Date() > invitation.expiresAt) {
                invitation.status = 'expired';
                await invitation.save();
                return next(ErrorHandler.badRequest('Invitation has expired'));
            }

            const existingUser = await userService.findUser({ email: invitation.email });
            if (existingUser) return next(ErrorHandler.badRequest('User already registered'));

            const employeeId = generateEmployeeId();
            const username = 'user' + crypto.randomInt(11111111, 999999999);
            const image = req.file ? req.file.path : 'user.png';

            const user = await userService.createUser({
                name,
                email: invitation.email,
                username,
                password,
                mobile,
                type: invitation.type,
                position: invitation.position,
                fatherName,
                motherName,
                presentAddress,
                permanentAddress,
                address: permanentAddress,
                nid,
                bloodGroup,
                employeeId,
                image,
                empire: invitation.empire || null,
                status: 'active'
            });

            invitation.status = 'completed';
            await invitation.save();

            res.json({
                success: true,
                message: 'Registration successful! Your Employee ID is ' + employeeId,
                user: new UserDto(user)
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
