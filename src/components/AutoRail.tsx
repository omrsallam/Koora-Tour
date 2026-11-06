import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A row of boxes that animates only when it doesn't fit.
 *
 * - Everything fits → a normal static row, nothing moves.
 * - Some boxes are hidden → the row slides one box at a time in a loop, with prev/next arrows,
 *   swipe on touch screens, an edge fade and progress dots.
 * - Pauses while hovered, focused or touched, and while the tab is hidden.
 * - With "reduce motion" turned on it never moves by itself; arrows and swipe still work.
 *
 * Movement is applied straight to the track's style (not through React state) so that every
 * click starts instantly from wherever the row currently is — even mid-slide — and clicking
 * fast never queues up, lags or jumps.
 */
const EASE = 'cubic-bezier(.22,.8,.24,1)';
const AUTO_MS = 700;   // autoplay slide
const CLICK_MS = 340;  // arrow / swipe slide — snappier

export default function AutoRail({
  children, interval = 3200, label, tone = 'light', itemWidth,
}: { children: ReactNode; interval?: number; label: string; tone?: 'light' | 'dark'; itemWidth?: number }) {
  const items = Children.toArray(children);
  const n = items.length;
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pos = useRef(0); // index of the box at the left edge, 0 … 2n-1 (second half = duplicate set)
  const [overflow, setOverflow] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const resumeTimer = useRef<number>();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const kids = () => (track.current?.children ?? []) as HTMLCollectionOf<HTMLElement>;
  const offsetOf = (i: number) => {
    const k = kids();
    return k[i] && k[0] ? k[i].offsetLeft - k[0].offsetLeft : 0;
  };
  const setWidth = () => offsetOf(n); // start of the duplicate set

  /** Move the track to `x` (px), optionally animated. */
  const place = (x: number, ms: number) => {
    const tr = track.current;
    if (!tr) return;
    tr.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none';
    tr.style.transform = `translate3d(${-x}px,0,0)`;
  };
  const currentX = () => {
    const tr = track.current;
    if (!tr) return 0;
    return -new DOMMatrix(getComputedStyle(tr).transform).m41;
  };

  // Does one full set of boxes fit inside the viewport?
  const measure = useCallback(() => {
    const vp = viewport.current, tr = track.current;
    if (!vp || !tr || n === 0) return;
    const k = tr.children as HTMLCollectionOf<HTMLElement>;
    const last = k[n - 1];
    if (!last) return;
    const w = last.offsetLeft + last.offsetWidth - k[0].offsetLeft;
    setOverflow(w > vp.clientWidth + 2);
  }, [n]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const ro = new ResizeObserver(() => { measure(); place(offsetOf(pos.current), 0); });
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure]);
  useLayoutEffect(() => {
    if (!overflow) { pos.current = 0; setActive(0); }
    place(offsetOf(pos.current), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflow]);

  const step = useCallback((dir: 1 | -1, ms: number) => {
    const tr = track.current;
    if (!tr || n === 0) return;
    // Start from where the row actually is right now (it may be mid-slide).
    let x = currentX();
    let p = pos.current;
    // Keep `p` inside the first set by hopping to the identical-looking duplicate, invisibly.
    if (p >= n) { p -= n; x -= setWidth(); }
    if (p + dir < 0) { p += n; x += setWidth(); }
    place(x, 0);
    void tr.offsetWidth; // commit the hop before animating
    p += dir;
    pos.current = p;
    place(offsetOf(p), ms);
    setActive(((p % n) + n) % n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    // Resting in the duplicate set → hop back to the identical first set.
    if (pos.current >= n) { pos.current -= n; place(offsetOf(pos.current), 0); }
  };

  // Autoplay in sequence.
  useEffect(() => {
    if (!overflow || paused || reduced) return;
    const t = window.setInterval(() => { if (!document.hidden) step(1, AUTO_MS); }, interval);
    return () => window.clearInterval(t);
  }, [overflow, paused, reduced, interval, step]);

  const pauseFor = (ms: number) => {
    setPaused(true);
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), ms);
  };
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  const boxStyle = itemWidth ? { flex: `0 0 ${itemWidth}px`, width: itemWidth } : undefined;

  return (
    <div
      className={`rail rail-${tone} ${overflow ? 'rail-moving' : ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => { window.clearTimeout(resumeTimer.current); setPaused(true); }}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { window.clearTimeout(resumeTimer.current); setPaused(true); touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start !== null && overflow) {
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1, CLICK_MS);
        }
        pauseFor(4000);
      }}
    >
      <div className="rail-viewport" ref={viewport}>
        <div className="rail-track" ref={track} onTransitionEnd={onTransitionEnd}>
          {items.map((c, i) => <div className="rail-item" style={boxStyle} key={`a${i}`}>{c}</div>)}
          {overflow && items.map((c, i) => (
            // Duplicate set for a seamless loop — hidden from assistive tech and keyboard.
            <div className="rail-item" style={boxStyle} key={`b${i}`} aria-hidden="true" ref={(el) => el?.setAttribute('inert', '')}>{c}</div>
          ))}
        </div>
      </div>
      {overflow && (
        <>
          <button className="rail-arrow rail-prev" onClick={() => step(-1, CLICK_MS)} aria-label="Previous">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button className="rail-arrow rail-next" onClick={() => step(1, CLICK_MS)} aria-label="Next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 5l7 7-7 7" /></svg>
          </button>
          {n <= 12 ? (
            <div className="rail-dots" aria-hidden="true">
              {items.map((_, i) => <span key={i} className={i === active ? 'on' : ''} />)}
            </div>
          ) : (
            // Long rows get a progress bar instead of a crowd of dots.
            <div className="rail-progress" aria-hidden="true"><span style={{ width: `${((active + 1) / n) * 100}%` }} /></div>
          )}
        </>
      )}
    </div>
  );
}
