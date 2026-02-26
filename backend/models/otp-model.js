const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// OTP type constants
// 1 = password reset, 2 = email verification, 3 = login verification
const OTP_TYPES = [1, 2, 3];

const getExpireTime = () => {
    return new Date(Date.now() + OTP_EXPIRY_MS);
};

const otpSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    otp: {
        type: Number,
        required: true,
    },
    type: {
        type: Number,
        enum: OTP_TYPES
    },
    expire: {
        type: Date,
        default: getExpireTime
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Otp', otpSchema, 'otps');