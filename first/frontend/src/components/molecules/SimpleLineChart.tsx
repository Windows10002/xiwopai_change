type Point = { label: string; value: number };

type SimpleLineChartProps = {
  points: Point[];
  height?: number;
  unit?: string;
  className?: string;
  /** 默认按百分比 0–100；count 时按数据自适应刻度 */
  scale?: "percent" | "count";
};

function buildTicks(max: number, scale: "percent" | "count"): number[] {
  if (scale === "percent") return [0, 25, 50, 75, 100];
  if (max <= 1) return [0, 1];
  if (max <= 5) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = Math.max(1, Math.ceil(max / 4));
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

export function SimpleLineChart({
  points,
  height = 140,
  unit = "%",
  className = "",
  scale = "percent",
}: SimpleLineChartProps) {
  if (points.length === 0) {
    return <p className={`text-center text-caption text-ink-muted ${className}`}>暂无趋势数据</p>;
  }

  const w = 320;
  const h = height;
  const pad = { t: 12, r: 12, b: 28, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const vals = points.map((p) => p.value);
  const dataMax = Math.max(...vals, 0);
  const min = scale === "count" ? 0 : Math.min(...vals, 0);
  const max = scale === "count" ? Math.max(dataMax, 1) : Math.max(...vals, 100);
  const span = max - min || 1;
  const ticks = buildTicks(max, scale);

  const coords = points.map((p, i) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.t + innerH - ((p.value - min) / span) * innerH;
    return { x, y, ...p };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-full" role="img" aria-label="趋势折线图">
        {ticks.map((tick) => {
          const y = pad.t + innerH - ((tick - min) / span) * innerH;
          return (
            <g key={tick}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
              <text x={4} y={y + 4} fontSize="9" fill="#64748b">
                {tick}
                {unit}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke="#52c41a" strokeWidth="2.5" strokeLinejoin="round" points={polyline} />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="4" fill="#389e0d" stroke="#fff" strokeWidth="1.5" />
            <text x={c.x} y={h - 6} textAnchor="middle" fontSize="8" fill="#64748b">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
