const Notification = require('../models/notification-model');
const ErrorHandler = require('../utils/error-handler');

class NotificationController {
    getNotifications = async (req, res, next) => {
        try {
            if (!req.user?._id) return next(ErrorHandler.unauthorized());

            const notifications = await Notification.find({ user: req.user._id, isRead: false })
                .sort({ createdAt: -1 });
            res.json({ success: true, data: notifications });
        } catch (error) {
            next(error);
        }
    }

    markAsRead = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!req.user?._id) return next(ErrorHandler.unauthorized());

            if (id === 'all') {
                await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
            } else {
                const notif = await Notification.findById(id);
                if (!notif) return next(ErrorHandler.notFound('Notification not found'));
                if (String(notif.user) !== String(req.user._id)) return next(ErrorHandler.forbidden());
                await Notification.findByIdAndUpdate(id, { isRead: true });
            }
            res.json({ success: true, message: 'Marked as read' });
        } catch (error) {
            next(error);
        }
    }

    deleteNotification = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!req.user?._id) return next(ErrorHandler.unauthorized());

            const notif = await Notification.findById(id);
            if (!notif) return next(ErrorHandler.notFound('Notification not found'));
            if (String(notif.user) !== String(req.user._id)) return next(ErrorHandler.forbidden());
            await Notification.findByIdAndDelete(id);
            res.json({ success: true, message: 'Notification deleted' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
