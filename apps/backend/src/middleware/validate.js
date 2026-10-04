/**
 * Generic request-body validator. Give it any Zod schema and it checks
 * req.body against it before the controller ever runs. If validation
 * fails, the ZodError goes to globalErrorHandler, which already knows
 * how to format it as a 422 with per-field messages.
 */
export function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) return next(result.error);
        req.body = result.data; // the cleaned, validated version
        next();
    };
}