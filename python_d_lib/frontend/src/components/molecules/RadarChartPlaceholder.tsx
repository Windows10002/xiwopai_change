/**
 * 维度雷达图占位（接入数据后可替换）
 */
export function RadarChartPlaceholder() {
  return (
    <div className="rounded-tile border border-dashed border-black/[0.1] bg-gray-50/80 px-4 py-8 text-center">
      <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">维度雷达 · 占位</p>
      <p className="mt-1 text-caption text-ink-subtle">接入数据后可替换为雷达图</p>
      <div className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-gray-200 bg-white">
        <span className="text-caption text-gray-300">Radar</span>
      </div>
    </div>
  );
}
