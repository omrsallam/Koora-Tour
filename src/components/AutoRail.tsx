import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A row of boxes that animates only when it doesn't fit.
 *
 * - Everything fits → a normal static row, nothing moves.
 * - Some boxes are hidden → the row slides one box at a time in a loop, with prev/next arrows,
 *   swipe on touch screens, edge fades, and progress dots.
 * - Pauses while hovered, focused or touched, and while the tab is hidden.
 * - With "reduce motion" turned on it never moves by itself; arrows and swipe still work.
 */
export default function AutoRail({
  children, interval = 3200, label, tone = 'light', itemWidth,
}: { children: ReactNode; interval?: number; label: string; tone?: 'light' | 'dark'; itemWidth?: number }) {
  const items = Children.toArray(children);
  const n = items.length;
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Does one full set of boxes fit inside the viewport?
  const measure = useCallback(() => {
    const vp = viewport.current, tr = track.current;
    if (!vp || !tr || n === 0) return;
    const kids = tr.children as HTMLCollectionOf<HTMLElement>;
    const last = kids[n - 1];
    if (!last) return;
    const setWidth = last.offsetLeft + last.offsetWidth - kids[0].offsetLeft;
    setOverflow(setWidth > vp.clientWidth + 2);
  }, [n]);

  useLayoutEffect(() => { measure(); }, [measure, items.length]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, [measure]);
  useEffect(() => { if (!overflow) { setAnimate(false); setIndex(0); } }, [overflow]);

  // Translate so that box `index` sits at the left edge.
  useLayoutEffect(() => {
    const tr = track.current;
    if (!tr) return;
    const kid = tr.children[index] as HTMLElement | undefined;
    setOffset(kid ? kid.offsetLeft - (tr.children[0] as HTMLElement).offsetLeft : 0);
  }, [index, overflow]);

  const step = useCallback((dir: 1 | -1) => {
    if (dir === -1 && index === 0) {
      // Jump (invisibly) to the duplicate set, then animate back one box.
      setAnimate(false);
      setIndex(n);
      requestAnimationFrame(() => requestAnimationFrame(() => { setAnimate(true); setIndex(n - 1); }));
      return;
    }
    setAnimate(true);
    setIndex((i) => i + dir);
  }, [index, n]);

  // Autoplay in sequence.
  useEffect(() => {
    if (!overflow || paused || reduced) return;
    const t = setInterval(() => { if (!document.hidden) step(1); }, interval);
    return () => clearInterval(t);
  }, [overflow, paused, reduced, interval, step]);

  // After sliding into the duplicate set, snap back to the real one without animation.
  const onTransitionEnd = () => {
    if (index >= n) { setAnimate(false); setIndex(index - n); }
  };
  useEffect(() => {
    if (!animate) { const r = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(r); }
  }, [animate]);

  const active = ((index % n) + n) % n;
  const boxStyle = itemWidth ? { flex: `0 0 ${itemWidth}px`, width: itemWidth } : undefined;

  return (
    <div
      className={`rail rail-${tone} ${overflow ? 'rail-moving' : ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { setPaused(true); touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start !== null && overflow) {
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }
        setTimeout(() => setPaused(false), 4000);
      }}
    >
      <div className="rail-viewport" ref={viewport}>
        <div
          className="rail-track"
          ref={track}
          style={{ transform: `translate3d(${-offset}px,0,0)`, transition: animate ? 'transform .7s cubic-bezier(.22,.8,.24,1)' : 'none' }}
          onTransitionEnd={onTransitionEnd}
        >
          {items.map((c, i) => <div className="rail-item" style={boxStyle} key={`a${i}`}>{c}</div>)}
          {overflow && items.map((c, i) => (
            // Duplicate set for a seamless loop — hidden from assistive tech and keyboard.
            <div className="rail-item" style={boxStyle} key={`b${i}`} aria-hidden="true" ref={(el) => el?.setAttribute('inert', '')}>{c}</div>
          ))}
        </div>
      </div>
      {overflow && (
        <>
          <button className="rail-arrow rail-prev" onClick={() => step(-1)} aria-label="Previous">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button className="rail-arrow rail-next" onClick={() => step(1)} aria-label="Next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="rail-dots" aria-hidden="true">
            {items.map((_, i) => <span key={i} className={i === active ? 'on' : ''} />)}
          </div>
        </>
      )}
    </div>
  );
}
