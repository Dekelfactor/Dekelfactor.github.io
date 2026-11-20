import React, { useEffect, useRef } from 'react';
import { useStudio, type SheetId } from '../store/useStudio';
import { Icon } from './Icon';
import { TOOLS } from './Chrome';

/**
 * Non-modal bottom sheet (the preview stays visible above it). Drag the grab
 * handle down or flick to dismiss; Escape closes it. On desktop the same
 * component docks as a side panel via CSS.
 */
export function Sheet({ title, children, actions, label, tool }: { title: string; children: React.ReactNode; actions?: React.ReactNode; label?: string; tool?: SheetId }) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const close = () => useStudio.getState().openSheet('none');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    ref.current?.querySelector<HTMLElement>('.tool-tabs .on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    if (ref.current) ref.current.style.transition = 'none';
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    const raw = e.clientY - drag.current.y;
    // damped when pulled upward, free when pulled down
    const dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
    drag.current.dy = raw;
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    const el = ref.current;
    if (!d || !el) return;
    el.style.transition = '';
    const v = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 120 || v > 0.5) { el.style.transform = 'translateY(100%)'; setTimeout(close, 220); }
    else el.style.transform = '';
  };

  return (
    <section ref={ref} className="sheet glass" role="dialog" aria-modal="false" aria-label={label ?? title}>
      <div className="sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true" />
      {tool ? (
        <nav className="tool-tabs" aria-label="Tools">
          {TOOLS.map(t => (
            <button key={t.id} className={t.id === tool ? 'on' : ''} aria-current={t.id === tool ? 'page' : undefined} onClick={() => useStudio.getState().openSheet(t.id)}>
              <Icon name={t.icon} />{t.label}
            </button>
          ))}
        </nav>
      ) : null}
      <div className="sheet-head">
        <h2 tabIndex={-1}>{title}</h2>
        {actions}
        <button className="ib" aria-label={`Close ${title}`} onClick={close}><Icon name="close" /></button>
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  );
}
