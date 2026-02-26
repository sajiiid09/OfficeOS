let io;
const connectedUsers = new Map();

const init = (socketIo) => {
    const UserModel = require('../models/user-model');
    io = socketIo;

    io.on('connection', (socket) => {
        socket.on('join', async (userId) => {
            if (!userId) return;

            const uid = userId.toString();
            if (!connectedUsers.has(uid)) {
                connectedUsers.set(uid, new Set());
                try {
                    await UserModel.findByIdAndUpdate(uid, { isOnline: true });
                    emitToAll('user-status-update', { userId: uid, isOnline: true });
                } catch (err) {
                    console.error(`Failed to update online status for ${uid}:`, err.message);
                }
            }
            connectedUsers.get(uid).add(socket.id);
        });

        socket.on('share-location', (data) => {
            emitToAdmins('user-location-update', data);
        });

        socket.on('disconnect', async () => {
            for (const [userId, socketIds] of connectedUsers.entries()) {
                if (!socketIds.has(socket.id)) continue;

                socketIds.delete(socket.id);
                if (socketIds.size === 0) {
                    try {
                        await UserModel.findByIdAndUpdate(userId, { isOnline: false });
                        emitToAll('user-status-update', { userId, isOnline: false });
                    } catch (err) {
                        console.error(`Failed to update offline status for ${userId}:`, err.message);
                    }
                    connectedUsers.delete(userId);
                }
                break;
            }
        });
    });
};

const emitToUser = (userId, event, data) => {
    if (!io) return;
    const socketIds = connectedUsers.get(userId.toString());
    if (!socketIds || socketIds.size === 0) return;
    socketIds.forEach(socketId => io.to(socketId).emit(event, data));
};

const emitToAll = (event, data) => {
    if (io) io.emit(event, data);
};

const emitToAdmins = async (event, data) => {
    if (!io) return;
    const UserModel = require('../models/user-model');
    const admins = await UserModel.find({ type: { $in: ['super_admin', 'sub_admin'] } });
    admins.forEach(admin => emitToUser(admin._id, event, data));
};

module.exports = { init, emitToUser, emitToAll, emitToAdmins };
