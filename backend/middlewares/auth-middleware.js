const tokenService = require('../services/token-service');
const ErrorHandler = require('../utils/error-handler');

const extractAccessToken = (req) => {
    const cookieToken = req.cookies?.accessToken;
    const header = req.headers?.authorization;
    const headerToken = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;
    return cookieToken || headerToken;
};

const auth = async (req, res, next) => {
    try {
        const accessToken = extractAccessToken(req);
        if (!accessToken) return next(ErrorHandler.unauthorized());

        const userData = await tokenService.verifyAccessToken(accessToken);
        if (!userData) return next(ErrorHandler.unauthorized());

        req.user = userData;
        next();
    } catch (err) {
        return next(ErrorHandler.unauthorized());
    }
};

const authRole = (allowedRoles) => (req, res, next) => {
    const userType = req.user?.type?.toLowerCase();
    const normalizedRoles = allowedRoles.map(role => role.toLowerCase());
    if (!normalizedRoles.includes(userType)) return next(ErrorHandler.forbidden());
    next();
};

module.exports = { auth, authRole };
