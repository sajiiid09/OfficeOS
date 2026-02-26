const NotificationModel = require('../models/notification-model');
const socketService = require('./socket-service');

/**
 * Centralized notification service.
 * Creates a persistent notification AND emits a real-time socket event.
 */

const notify = async (userId, { title, message, type, link }) => {
    const notification = await NotificationModel.create({ user: userId, title, message, type, link });
    socketService.emitToUser(userId, 'notification', { title, message, type, link });
    return notification;
};

const notifyAdmins = async ({ title, message, type, link }) => {
    const UserModel = require('../models/user-model');
    const admins = await UserModel.find({ type: { $in: ['super_admin', 'sub_admin'] } });

    const notifications = await Promise.all(
        admins.map(admin =>
            NotificationModel.create({ user: admin._id, title, message, type, link })
        )
    );

    socketService.emitToAdmins('notification', { title, message, type, link });
    return notifications;
};

module.exports = { notify, notifyAdmins };
