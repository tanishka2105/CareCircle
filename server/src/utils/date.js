import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const getNowUtc = () => new Date().toISOString();

export const formatInTimezone = (date, timezone = DEFAULT_TIMEZONE, fmt = 'yyyy-MM-dd HH:mm:ss') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, timezone);
  return formatTz(zoned, fmt, { timeZone: timezone });
};

export const getLocalStartOfDay = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const zoned = toZonedTime(date, timezone);
  const start = startOfDay(zoned);
  return fromZonedTime(start, timezone);
};

export const getLocalEndOfDay = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const zoned = toZonedTime(date, timezone);
  const end = endOfDay(zoned);
  return fromZonedTime(end, timezone);
};
