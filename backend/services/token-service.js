const jwt = require('jsonwebtoken');
const TokenModel = require('../models/token-model');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '1y';

class TokenService {
    generateToken(payload) {
        const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
        const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
        return { accessToken, refreshToken };
    }

    async storeRefreshToken(userId, token) {
        const tokenEntry = { token };
        const exists = await TokenModel.exists({ userId });
        if (!exists) return TokenModel.create({ userId, tokens: tokenEntry });
        return TokenModel.findOneAndUpdate({ userId }, { $push: { tokens: tokenEntry } });
    }

    async removeRefreshToken(userId, token) {
        return TokenModel.updateOne(
            { userId, 'tokens.token': token },
            { $pull: { tokens: { token } } }
        );
    }

    verifyRefreshToken(refreshToken) {
        return jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    }

    verifyAccessToken(accessToken) {
        return jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    }

    async findRefreshToken(userId, token) {
        return TokenModel.findOne(
            { userId, 'tokens.token': token }
        ).select({ tokens: { $elemMatch: { token } } });
    }

    async updateRefreshToken(userId, oldToken, newToken) {
        return TokenModel.findOneAndUpdate(
            { userId, 'tokens.token': oldToken },
            { $set: { 'tokens.$.token': newToken } }
        );
    }
}

module.exports = new TokenService();