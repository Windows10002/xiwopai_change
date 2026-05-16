type PreviewPlaceholderProps = {
  label?: string;
};

/**
 * 上传预览占位（与 Flask 版「预览将显示在此处」一致）
 */
export function PreviewPlaceholder({ label = "预览将显示在此处" }: PreviewPlaceholderProps) {
  return (
    <div className="rounded-card border-2 border-black/[0.08] bg-white px-4 py-10 text-center text-small text-gray-400 shadow-card">
      {label}
    </div>
  );
}
