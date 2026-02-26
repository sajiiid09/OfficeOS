module.exports = (err, req, res, _next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    if (err.name === 'ValidationError') {
        message = Object.values(err.errors).map(value => value.message).join(', ');
        statusCode = 400;
    }

    if (err.name === 'MulterError') {
        statusCode = 400;
    }

    if (statusCode === 500 && message.toLowerCase().includes('invalid file type')) {
        statusCode = 400;
    }

    if (statusCode >= 500) {
        console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
        if (err.stack) console.error(err.stack);
    }

    res.status(statusCode).json({ success: false, message });
};
