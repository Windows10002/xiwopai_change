type ScoreRingProps = {
  percent: number;
  size?: number;
  className?: string;
};

/** 得分率圆环（渐变描边 + 柔和光晕） */
export function ScoreRing({ percent, size = 88, className = "" }: ScoreRingProps) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;
  const gradId = `score-ring-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 -rotate-90 drop-shadow-[0_2px_8px_rgba(81,197,39,0.25)] ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6dd43a" />
          <stop offset="50%" stopColor="#51c527" />
          <stop offset="100%" stopColor="#3dad1a" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5f3dc" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}
