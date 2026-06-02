type RadarAxis = { label: string; value: number; max: number };

type SimpleRadarChartProps = {
  axes: RadarAxis[];
  size?: number;
  className?: string;
};

export function SimpleRadarChart({ axes, size = 200, className = "" }: SimpleRadarChartProps) {
  if (axes.length < 3) {
    return <p className={`text-center text-caption text-ink-muted ${className}`}>至少需要 3 个维度</p>;
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const n = axes.length;
  const angle0 = -Math.PI / 2;

  const vertex = (i: number, scale: number) => {
    const a = angle0 + (i * 2 * Math.PI) / n;
    return { x: cx + r * scale * Math.cos(a), y: cy + r * scale * Math.sin(a) };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = axes.map((ax, i) => {
    const ratio = ax.max > 0 ? Math.min(1, Math.max(0, ax.value / ax.max)) : 0;
    return vertex(i, ratio);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="维度雷达图">
        {gridLevels.map((lv) => {
          const pts = Array.from({ length: n }, (_, i) => vertex(i, lv));
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
          return <path key={lv} d={d} fill="none" stroke="rgba(82,196,26,0.15)" strokeWidth="1" />;
        })}
        {axes.map((_, i) => {
          const p = vertex(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />;
        })}
        <path d={dataPath} fill="rgba(82,196,26,0.25)" stroke="#52c41a" strokeWidth="2" />
        {axes.map((ax, i) => {
          const p = vertex(i, 1.12);
          return (
            <text key={ax.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#475569">
              {ax.label.length > 6 ? `${ax.label.slice(0, 5)}…` : ax.label}
            </text>
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap justify-center gap-2 text-[0.65rem] text-ink-muted">
        {axes.map((ax) => (
          <li key={ax.label} className="rounded-full bg-primary-tint/80 px-2 py-0.5">
            {ax.label} {ax.value}/{ax.max}
          </li>
        ))}
      </ul>
    </div>
  );
}
