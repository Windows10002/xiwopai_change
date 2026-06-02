import { Link } from "react-router-dom";
import { Construction } from "lucide-react";

import { Navbar } from "@/components/atoms/Navbar";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";

/** 语文作文：占位页，不调用批改核心（后续可接独立模块） */
export function ChineseGradingPage() {
  return (
    <div className="page-bg-hero-stunning relative flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <IpBrandFace size="hero" className="mb-6" />
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-caption font-bold text-amber-900 ring-1 ring-amber-200/80">
          <Construction className="h-4 w-4" {...CUTE_ICON} aria-hidden />
          即将上线
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">语文作文批改</h1>
        <p className="mt-3 text-small leading-relaxed text-ink-muted">
          希沃智教π 将支持语文作文的过程性评分与学情分析。当前版本请先使用
          <strong className="text-ink"> 数学作业 </strong>与<strong className="text-ink"> 英语作文 </strong>批改。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/math" className="btn-brand-primary px-5 py-2.5 text-small">
            数学批改
          </Link>
          <Link to="/english" className="rounded-xl border border-primary/25 bg-white px-5 py-2.5 text-small font-bold text-brand">
            英语批改
          </Link>
          <Link to="/" className="text-small font-semibold text-ink-muted underline">
            返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}
