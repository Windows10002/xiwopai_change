import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { AppLink } from "@/components/atoms/AppLink";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { PiTutorChat } from "@/components/organisms/PiTutorChat";
import { StudentPageShell } from "@/components/molecules/StudentPageShell";
import {
  formatWrongBookDate,
  loadWrongBookItems,
  subjectLabelCn as wbSubjectLabel,
  type WrongBookItem,
} from "@/lib/wrongQuestionBook";

/** 学生端 π 助学：错题分析 + 智能问答 */
export function StudentPiTutorPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useMemo(() => loadWrongBookItems().slice(0, 24), []);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <StudentPageShell pageTitle="π 助学" mainClassName="max-w-6xl">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">π 助学</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            选一道错题让 π 帮你分析错因与订正思路；也可以直接输入不会的题目提问。智能问答模式需配置 Agnes API。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-black/[0.08] bg-white/90 p-3 shadow-sm ring-1 ring-violet-100/80 lg:max-h-[36rem] lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <h2 className="text-caption font-extrabold text-ink">最近错题</h2>
              <AppLink to="/wrong-book" className="text-[0.65rem] font-bold text-violet-700 hover:underline">
                全部 →
              </AppLink>
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-violet-200/80 bg-violet-50/50 px-3 py-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-violet-400/70" {...CUTE_ICON} aria-hidden />
                <p className="mt-2 text-caption font-semibold text-ink">还没有错题</p>
                <p className="mt-1 text-[0.65rem] text-ink-muted">完成批改后会自动收录，也可直接右侧提问</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <WrongPickRow
                    key={item.id}
                    item={item}
                    active={selectedId === item.id}
                    onPick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                  />
                ))}
              </ul>
            )}
          </aside>

          <PiTutorChat
            tutorContext={{ selected, recentItems: items }}
            className="min-h-[32rem] lg:min-h-[36rem]"
          />
        </div>
      </main>
    </StudentPageShell>
  );
}

function WrongPickRow({
  item,
  active,
  onPick,
}: {
  item: WrongBookItem;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
          active
            ? "bg-violet-100 ring-2 ring-violet-400/50"
            : "bg-gray-50/80 hover:bg-violet-50/80 ring-1 ring-black/[0.05]"
        }`}
      >
        <span className="campus-tag campus-tag--sky text-[0.6rem]">{wbSubjectLabel(item.subject)}</span>
        <p className="mt-1 line-clamp-2 text-caption font-bold text-ink">{item.questionLabel}</p>
        <p className="mt-0.5 text-[0.6rem] text-ink-muted">
          {item.status} · {item.scoreText} · {formatWrongBookDate(item.createdAt)}
        </p>
      </button>
    </li>
  );
}
