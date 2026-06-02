type ScoreRingProps = {
  percent: number;
  size?: number;
  className?: string;
};

const RING_COLOR = "#51c527";
const TRACK_COLOR = "#dcecd4";

/** 得分率圆环 */
export function ScoreRing({ percent, size = 84, className = "" }: ScoreRingProps) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 -rotate-90 ${className}`}
      aria-hidden
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK_COLOR} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={RING_COLOR}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}
