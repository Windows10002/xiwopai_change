/** 页面背景装饰气泡（纯视觉，pointer-events: none） */
export function PageDecoFloats() {
  return (
    <div className="page-deco-floats" aria-hidden>
      <span className="deco-bubble deco-bubble-1" />
      <span className="deco-bubble deco-bubble-2" />
      <span className="deco-bubble deco-bubble-3" />
    </div>
  );
}
