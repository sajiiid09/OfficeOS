class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }

    static serverError(message = 'Something Went Wrong') {
        return new ErrorHandler(message, 500);
    }

    static badRequest(message = 'Bad Request') {
        return new ErrorHandler(message, 400);
    }

    static conflict(message = 'Conflict') {
        return new ErrorHandler(message, 409);
    }

    static notFound(message = 'Resource Not Found') {
        return new ErrorHandler(message, 404);
    }

    static unauthorized(message = 'Unauthorized Access') {
        return new ErrorHandler(message, 401);
    }

    static forbidden(message = 'Not Allowed') {
        return new ErrorHandler(message, 403);
    }

    // Legacy aliases — kept for backward compatibility
    static unAuthorized(message) { return ErrorHandler.unauthorized(message); }
    static notAllowed(message) { return ErrorHandler.forbidden(message); }
}

module.exports = ErrorHandler;
