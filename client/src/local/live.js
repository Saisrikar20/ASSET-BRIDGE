// Browser stand-in for server/src/lib/live.js: "pushes" become window events
// that the LiveProvider listens to, so alerts still stream in one by one.
export const LIVE_EVENT = 'ab-live';

export function attachLive() {}

export function push(userId, type, data) {
  window.dispatchEvent(new CustomEvent(LIVE_EVENT, { detail: { userId, type, data, at: new Date().toISOString() } }));
}
