import { ZodError } from 'zod';

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      code: 'NOT_FOUND',
    },
  });
};

export const errorHandler = (err, req, res, next) => {
  // Never leak secrets or passcodes in logs
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'APP_ERROR',
      },
    });
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
};
