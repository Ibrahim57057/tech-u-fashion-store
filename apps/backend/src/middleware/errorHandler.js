import { ZodError } from 'zod';

/**
 * Thrown by our own code for expected, user-facing problems — a wrong
 * password, a product that doesn't exist, insufficient stock. This is
 * the backend's version of the clear "must be used inside a Provider"
 * errors we built on the frontend: fail with a specific, useful
 * message, not a generic crash.
 */
export class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // marks this as an "expected" error, not a bug
    }
}

/** Runs when no route matches the request at all. */
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
    });
}

/**
 * The single place every error in the app ends up, whether thrown
 * manually (AppError), thrown by Zod validation, or an unexpected bug.
 * Express recognizes this as error-handling middleware specifically
 * because it takes FOUR arguments (err, req, res, next) — that's not
 * a style choice, it's how Express distinguishes this from a normal
 * middleware function.
 */
// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, next) {
    // Thrown by body-parser before any of our code runs, when the request
    // body is not valid JSON. It already carries a 400 but is not one of our
    // own AppErrors, so without this a malformed body would be reported to
    // the caller as an unexplained 500 crash.
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: { message: 'Malformed request body. Check the JSON you sent.' },
        });
    }

    // Thrown by Mongoose when a path is given something the wrong shape —
    // most often a malformed id in a URL, like PATCH /categories/not-an-id.
    // That is a bad request from the caller, so it answers 400 with a plain
    // message rather than being reported as an unexplained server crash.
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: { message: `Invalid value for "${err.path}"` },
        });
    }

    // Thrown by Mongoose when a unique index is violated. Two admins saving the
    // same SKU or email at the same instant both pass the "does it exist yet"
    // check, and the database has the final say.
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: { message: 'That value is already taken' },
        });
    }

    // Zod validation errors get a specific, structured response so the
    // frontend can show which field(s) failed and why.
    if (err instanceof ZodError) {
        return res.status(422).json({
            success: false,
            error: {
                message: 'Validation failed',
                details: err.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            },
        });
    }

    const statusCode = err.isOperational ? err.statusCode : 500;

    // Only log to the console when it's a real, unexpected bug — an
    // AppError (like "wrong password") is routine and expected, not
    // something that needs to clutter server logs.
    if (!err.isOperational) {
        // Field by field, deliberately not `console.error(err)`. body-parser
        // attaches the raw request text as `err.body`, so printing the whole
        // error object wrote customers' plaintext passwords into the log file
        // on every bad request to /auth/login and /auth/register. `message`
        // and `stack` describe the failure without echoing the payload.
        console.error('UNEXPECTED ERROR 💥', {
            name: err.name,
            statusCode: err.statusCode,
            message: err.message,
            stack: err.stack,
        });
    }

    res.status(statusCode).json({
        success: false,
        error: {
            message: err.isOperational ? err.message : 'Something went wrong on our end.',
        },
    });
}