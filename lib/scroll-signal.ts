/**
 * A single, shared scroll listener. Instead of every component attaching its
 * own `scroll`/`resize` handler, they subscribe here; one rAF-throttled handler
 * fans out to all subscribers. Keeps scroll-linked work on one frame budget.
 *
 * Subscribers read whatever they need (e.g. `getBoundingClientRect`) inside
 * their callback — this module only owns the listener and the throttle.
 */

type ScrollCallback = () => void;

const subscribers = new Set<ScrollCallback>();
let listening = false;
let ticking = false;

function flush() {
  ticking = false;
  for (const cb of subscribers) cb();
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(flush);
}

/**
 * Subscribe to scroll/resize. Returns an unsubscribe function. The callback
 * fires once immediately so the subscriber can set its initial state.
 */
export function subscribeScroll(callback: ScrollCallback): () => void {
  if (typeof window !== "undefined" && !listening) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    listening = true;
  }
  subscribers.add(callback);
  callback();
  return () => {
    subscribers.delete(callback);
  };
}
