const pad = (n) => String(n).padStart(2, '0');

// Local-date key (YYYY-MM-DD), matches doseLogs.scheduledDate
export const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

export const timeAgo = (iso, now = Date.now()) => {
  if (!iso) return '';
  const diffSec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diffSec < 45) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};