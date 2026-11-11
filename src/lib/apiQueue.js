// Limits how many requests run at once (to avoid triggering rate limits when many
// components fetch at the same time), while retrying rate-limited calls with backoff.
// Unlike a single serial queue, one call's backoff only holds its own slot — the other
// slots keep processing unrelated requests, so nothing gets globally blocked.
const MAX_CONCURRENT = 4;
let active = 0;
const waiting = [];

function runWithRetry(fn, attempt = 0) {
  return fn().catch(err => {
    const message = String(err?.message || '');
    const isRateLimit = message.includes('Rate limit');
    const isNetworkError = /network error|failed to fetch|network request failed|timeout/i.test(message);
    const retryLimit = isRateLimit ? 5 : isNetworkError ? 3 : 0;
    if (attempt < retryLimit) {
      const delay = Math.min(500 * Math.pow(2, attempt), 8000) * (0.5 + Math.random());
      return new Promise(r => setTimeout(r, delay)).then(() => runWithRetry(fn, attempt + 1));
    }
    throw err;
  });
}

function next() {
  if (active >= MAX_CONCURRENT || waiting.length === 0) return;
  const { fn, resolve, reject } = waiting.shift();
  active++;
  runWithRetry(fn).then(resolve, reject).finally(() => { active--; next(); });
}

export function enqueue(fn) {
  return new Promise((resolve, reject) => {
    waiting.push({ fn, resolve, reject });
    next();
  });
}