import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * Hand-drawn symbol set for Zirplus. Every piece is plain SVG so it renders on the server, scales
 * cleanly and inherits the pastel gradient. Motion comes from CSS classes and stops under
 * prefers-reduced-motion.
 */

export function Sparkle({ size = 18, className, color = "#f6f1ea" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 1c.8 5.6 2.4 7.6 11 11-8.6 3.4-10.2 5.4-11 11-.8-5.6-2.4-7.6-11-11 8.6-3.4 10.2-5.4 11-11z" fill={color} />
    </svg>
  );
}

export function Planet({ size = 54, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={`pl-${id}`} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fde7d4" />
          <stop offset="0.6" stopColor="#f5b3a3" />
          <stop offset="1" stopColor="#d98b8f" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="16" fill={`url(#pl-${id})`} />
      <ellipse cx="32" cy="34" rx="28" ry="7" fill="none" stroke="#f4e2a3" strokeWidth="2" transform="rotate(-18 32 34)" />
    </svg>
  );
}

export function PaperPlane({ size = 46, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path d="M4 22 44 6 32 42 22 28z" fill="#efe4d6" />
      <path d="M22 28 44 6 16 25z" fill="#d8c8b4" />
      <path d="M22 28v11l5-6" fill="#c9b49c" />
    </svg>
  );
}

export function Coin({ size = 40, className, label = "$" }: { size?: number; className?: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`cn-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8ecbd" />
          <stop offset="1" stopColor="#e8c27a" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="22" rx="15" ry="15" fill="#c79a52" />
      <circle cx="20" cy="19" r="15" fill={`url(#cn-${id})`} />
      <circle cx="20" cy="19" r="11" fill="none" stroke="#c79a52" strokeOpacity="0.5" />
      <text x="20" y="24" textAnchor="middle" fontSize="14" fontFamily="Prompt, sans-serif" fill="#8a6527">
        {label}
      </text>
    </svg>
  );
}

export function Leaf({ size = 26, className, color = "#c4e2a9" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M4 28C4 14 12 4 28 4c0 16-10 24-24 24z" fill={color} />
      <path d="M6 26 22 10" stroke="#232325" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Candles({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="42" height="42" rx="11" fill="#2b2b2e" stroke="rgb(255 255 255 / 0.15)" />
      <path d="M12 12v20M22 9v24M32 14v16" stroke="#a8a299" strokeWidth="1.2" />
      <rect x="9" y="16" width="6" height="11" rx="1.5" fill="#f2a9b1" />
      <rect x="19" y="12" width="6" height="14" rx="1.5" fill="#c4e2a9" />
      <rect x="29" y="17" width="6" height="9" rx="1.5" fill="#c4e2a9" />
    </svg>
  );
}

/** A soft cumulus built from overlapping shaded discs: the "idea cloud" at the centre of the orbit. */
function Cloud({ id }: { id: string }) {
  const puffs: [number, number, number][] = [
    [200, 214, 44],
    [248, 200, 52],
    [298, 214, 42],
    [226, 176, 40],
    [276, 168, 46],
    [178, 236, 30],
    [320, 238, 30],
    [250, 240, 46],
  ];
  return (
    <g filter={`url(#soft-${id})`}>
      {puffs.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#puff-${id})`} />
      ))}
    </g>
  );
}

/**
 * The hero illustration: a cloud of ideas held by two tilted orbits, with the venue's symbols
 * (a stock token planet, USDG coin, a chart, a paper plane for settlement, leaves and sparkles)
 * drifting along the tracks.
 */
export function Orbit({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={cn("relative aspect-[5/4] w-full select-none", className)} aria-hidden="true">
      <svg viewBox="0 0 500 400" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c4e2a9" />
            <stop offset="0.35" stopColor="#f4e2a3" />
            <stop offset="0.7" stopColor="#f5c39c" />
            <stop offset="1" stopColor="#f2a9b1" />
          </linearGradient>
          <radialGradient id={`puff-${id}`} cx="40%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#ece8e3" />
            <stop offset="1" stopColor="#b9b4ae" />
          </radialGradient>
          <filter id={`soft-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <radialGradient id={`halo-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f5c39c" stopOpacity="0.28" />
            <stop offset="1" stopColor="#f5c39c" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="250" cy="210" r="190" fill={`url(#halo-${id})`} />

        {/* back halves of the orbits */}
        <g className="spin-slow" style={{ transformOrigin: "250px 210px" }}>
          <ellipse cx="250" cy="210" rx="215" ry="62" fill="none" stroke={`url(#ring-${id})`} strokeWidth="1.6" transform="rotate(-14 250 210)" opacity="0.9" />
          <circle cx="462" cy="160" r="5" fill="#f2a9b1" />
          <circle cx="40" cy="262" r="4" fill="#c4e2a9" />
        </g>
        <g className="spin-rev" style={{ transformOrigin: "250px 210px" }}>
          <ellipse cx="250" cy="210" rx="190" ry="48" fill="none" stroke={`url(#ring-${id})`} strokeWidth="1.2" transform="rotate(16 250 210)" opacity="0.75" />
          <circle cx="78" cy="160" r="3.5" fill="#f4e2a3" />
        </g>

        <Cloud id={id} />

        {/* the Z+ held in the cloud, as if the idea were the venue itself */}
        <g transform="translate(222 182)">
          <path d="M8 8h40L8 48h40" fill="none" stroke="#3a3632" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        </g>
      </svg>

      {/* symbols placed in HTML so they can float independently */}
      <div className="float absolute left-[70%] top-[6%]"><Planet size={70} /></div>
      <div className="float-2 absolute left-[4%] top-[50%]"><PaperPlane size={52} /></div>
      <div className="float-3 absolute left-[80%] top-[58%]"><Coin size={44} /></div>
      <div className="float absolute left-[16%] top-[14%]"><Candles size={46} /></div>
      <div className="float-2 absolute left-[60%] top-[80%]"><Leaf size={26} /></div>
      <div className="float-3 absolute left-[30%] top-[78%]"><Leaf size={20} color="#f2a9b1" /></div>
      <div className="float absolute left-[52%] top-[2%]"><Sparkle size={16} color="#f4e2a3" /></div>
      <div className="float-2 absolute left-[90%] top-[30%]"><Sparkle size={12} /></div>
      <div className="float-3 absolute left-[8%] top-[34%]"><Sparkle size={10} color="#f5c39c" /></div>
    </div>
  );
}

/** Two concentric tilted rings with a few dots: a lightweight backdrop for headers and empty states. */
export function OrbitLines({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 400 200" className={cn("pointer-events-none", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`ol-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c4e2a9" />
          <stop offset="0.5" stopColor="#f5c39c" />
          <stop offset="1" stopColor="#f2a9b1" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="100" rx="190" ry="54" fill="none" stroke={`url(#ol-${id})`} strokeWidth="1.2" transform="rotate(-10 200 100)" opacity="0.7" />
      <ellipse cx="200" cy="100" rx="150" ry="36" fill="none" stroke={`url(#ol-${id})`} strokeWidth="1" transform="rotate(12 200 100)" opacity="0.5" />
      <circle cx="372" cy="70" r="4" fill="#f2a9b1" />
      <circle cx="40" cy="128" r="3" fill="#c4e2a9" />
      <circle cx="300" cy="140" r="2.5" fill="#f4e2a3" />
    </svg>
  );
}
