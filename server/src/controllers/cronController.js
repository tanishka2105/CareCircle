import { env } from '../config/env.js';
import { runCronTick } from '../services/cronService.js';

export const handleCronTick = async (req, res, next) => {
  try {
    const cronSecretHeader =
      req.headers['x-cron-secret'] ||
      req.headers['x_cron_secret'] ||
      req.get('X-Cron-Secret') ||
      req.get('x-cron-secret') ||
      (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

    if (!cronSecretHeader || cronSecretHeader !== env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized. Invalid or missing CRON_SECRET.',
          code: 'UNAUTHORIZED_CRON',
        },
      });
    }

    const stats = await runCronTick();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (err) {
    next(err);
  }
};
