export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// All paths are relative to /api, e.g. api.get('/notes')
// Returns the `data` field of { success, data } responses.
const request = async (path, { method = 'GET', body, signal } = {}) => {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error. Please check your connection.', { code: 'NETWORK_ERROR' });
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok || json?.success === false) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, {
      status: res.status,
      code: json?.error?.code,
    });
  }

  return json && 'data' in json ? json.data : json;
};

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body ?? {} }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body: body ?? {} }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body: body ?? {} }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};