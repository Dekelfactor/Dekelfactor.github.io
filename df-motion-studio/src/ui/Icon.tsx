import React from 'react';

const P: Record<string, React.ReactNode> = {
  menu: <><path d="M4 7h16M4 12h16M4 17h10" /></>,
  play: <path d="M7 4.5v15l12-7.5z" />,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></>,
  redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 000 11H13" /></>,
  export: <><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></>,
  diamond: <path d="M12 3l9 9-9 9-9-9z" />,
  camera: <><path d="M3 7h12v10H3z" /><path d="M15 10l6-3v10l-6-3" /></>,
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  fx: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  timeline: <><path d="M3 6h10M3 12h14M3 18h8" /><path d="M17 3v6M21 15v6" /></>,
  scene: <><path d="M3 18c3-5 6-7 9-7s6 2 9 7" /><circle cx="16" cy="6" r="2.5" /><path d="M2 21h20" /></>,
  send: <><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></>,
  paste: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 11h6M9 15h4" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  file: <><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /></>,
  download: <><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  upload: <><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></>,
  sparkle: <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" />,
  gauge: <><path d="M4 16a8 8 0 1116 0" /><path d="M12 16l4-5" /></>,
  orbit: <><ellipse cx="12" cy="12" rx="10" ry="4.5" /><circle cx="12" cy="12" r="2.5" /></>,
  reset: <><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8" /><path d="M3 3v5h5" /></>,
  text: <><path d="M5 6V4h14v2" /><path d="M12 4v16" /><path d="M9 20h6" /></>,
  cube: <><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M3 7l9 5 9-5" /><path d="M12 12v10" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
  audio: <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />,
  shape: <><circle cx="8" cy="8" r="4.5" /><rect x="11" y="11" width="9" height="9" rx="1.5" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  split: <><path d="M12 3v18" /><path d="M5 8l-2 4 2 4" /><path d="M19 8l2 4-2 4" /></>,
  magnet: <><path d="M6 3v8a6 6 0 0012 0V3" /><path d="M6 7h4M14 7h4" /></>,
  curve: <><path d="M3 20C10 20 9 4 21 4" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
};

export function Icon({ name, className = 'icon', title }: { name: keyof typeof P | string; className?: string; title?: string }) {
  const fillIcon = name === 'play' || name === 'pause';
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}
      style={fillIcon ? { fill: 'currentColor', stroke: 'none' } : undefined}>
      {title ? <title>{title}</title> : null}
      {P[name] ?? null}
    </svg>
  );
}
