import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { useAppSession } from "@/hooks/useAppSession";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { PiChatMessage } from "@/lib/piAssistant/piAssistantEngine";
import {
  appendUserMessage,
  buildPiTutorReply,
  buildPiTutorWelcome,
  formatWrongBookForLlm,
  type PiTutorContext,
} from "@/lib/piAssistant/piTutorEngine";
import {
  fetchAssistantConfig,
  maxRoundsForRole,
  postAssistantChat,
  type AssistantChatTurn,
  type AssistantConfig,
} from "@/lib/piAssistantChatApi";
import { saveUserPreferences, type AssistantModePref } from "@/lib/userPreferences";

const TUTOR_CHIPS = [
  { label: "分析当前错题", prompt: "请分析当前选中的错题" },
  { label: "薄弱点汇总", prompt: "我的薄弱点有哪些" },
  { label: "订正建议", prompt: "这道题怎么订正" },
  { label: "我不会做", prompt: "这道题我不会做，请分步讲解" },
] as const;

function countUserTurns(messages: PiChatMessage[]) {
  return messages.filter((m) => m.role === "user").length;
}

function toApiTurns(messages: PiChatMessage[]): AssistantChatTurn[] {
  return messages
    .filter((m) => m.role === "user" || (m.role === "assistant" && m.source !== "pending"))
    .map((m) => ({ role: m.role, content: m.text }));
}

type PiTutorChatProps = {
  tutorContext: PiTutorContext;
  className?: string;
};

/** π 助学对话区 */
export function PiTutorChat({ tutorContext, className = "" }: PiTutorChatProps) {
  const session = useAppSession();
  const role = session?.role ?? null;
  const prefs = useUserPreferences();
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | null>(null);
  const [messages, setMessages] = useState<PiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const ctxKey = `${tutorContext.selected?.id ?? ""}-${tutorContext.recentItems?.length ?? 0}`;

  const llmAvailable = Boolean(assistantConfig?.llm_available);
  const effectiveMode: AssistantModePref =
    prefs.assistantMode === "llm" && llmAvailable ? "llm" : "rules";
  const maxRounds = assistantConfig ? maxRoundsForRole(assistantConfig, role) : 20;
  const userTurns = countUserTurns(messages);
  const disclaimer = assistantConfig?.disclaimer ?? "讲解仅供参考，请结合教师评语与课本。";

  useEffect(() => {
    void fetchAssistantConfig().then(setAssistantConfig).catch(() => setAssistantConfig(null));
  }, []);

  useEffect(() => {
    setMessages([buildPiTutorWelcome(tutorContext)]);
    setInput("");
    setSending(false);
  }, [ctxKey, effectiveMode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const llmContext = tutorContext.selected
    ? formatWrongBookForLlm(tutorContext.selected)
    : tutorContext.recentItems?.length
      ? `最近错题 ${tutorContext.recentItems.length} 道，用户可在左侧点选具体题目。`
      : "";

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg = appendUserMessage(trimmed);
      const nextMessages = [...messages, userMsg];

      if (effectiveMode === "rules") {
        setMessages([...nextMessages, { ...buildPiTutorReply(trimmed, tutorContext), source: "rules" }]);
        setInput("");
        return;
      }

      const turnsAfterUser = countUserTurns(nextMessages);
      if (turnsAfterUser > maxRounds) {
        setMessages([
          ...nextMessages,
          {
            id: `${Date.now()}-limit`,
            role: "assistant",
            source: "rules",
            text: `本轮对话已达 ${maxRounds} 轮上限，请刷新页面重新开始。`,
          },
        ]);
        setInput("");
        return;
      }

      const pendingId = `${Date.now()}-pending`;
      setMessages([...nextMessages, { id: pendingId, role: "assistant", text: "π 正在思考…", source: "pending" }]);
      setInput("");
      setSending(true);

      try {
        const res = await postAssistantChat({
          messages: toApiTurns(nextMessages),
          path: "/pi-tutor",
          role,
          context: llmContext,
        });
        if (res.ok && res.reply) {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== pendingId),
            { id: `${Date.now()}-llm`, role: "assistant", text: res.reply!, source: "llm" },
          ]);
        } else {
          const fallback = buildPiTutorReply(trimmed, tutorContext);
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== pendingId),
            {
              ...fallback,
              source: "rules",
              text: `${res.message || "智能问答暂不可用"}\n\n${fallback.text}`,
            },
          ]);
        }
      } catch (e) {
        const fallback = buildPiTutorReply(trimmed, tutorContext);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== pendingId),
          {
            ...fallback,
            source: "rules",
            text: `${e instanceof Error ? e.message : "网络错误"}\n\n${fallback.text}`,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, effectiveMode, tutorContext, role, maxRounds, llmContext],
  );

  const setAssistantMode = (mode: AssistantModePref) => {
    saveUserPreferences({ assistantMode: mode });
  };

  return (
    <div className={`flex min-h-[28rem] flex-col rounded-2xl border border-black/[0.08] bg-white/95 shadow-card ring-1 ring-primary/10 ${className}`}>
      <header className="shrink-0 border-b border-black/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <IpBrandFace size="sm" decorative />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-body font-extrabold text-ink">
              <Sparkles className="h-4 w-4 text-violet-500" {...CUTE_ICON} aria-hidden />
              π 助学
            </p>
            <p className="text-caption text-ink-muted">
              {effectiveMode === "llm" ? "智能讲解 · 错题分析" : "规则模式 · 错题分析 · 可切智能问答"}
            </p>
          </div>
        </div>
        {llmAvailable ? (
          <div className="mt-2 flex rounded-xl bg-surface-page/80 p-0.5 ring-1 ring-black/[0.06]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={effectiveMode === "rules"}
              onClick={() => setAssistantMode("rules")}
              className={`flex-1 rounded-lg px-2 py-1.5 text-caption font-bold transition ${
                effectiveMode === "rules" ? "bg-white text-violet-800 shadow-sm" : "text-ink-muted"
              }`}
            >
              规则
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={effectiveMode === "llm"}
              onClick={() => setAssistantMode("llm")}
              className={`flex-1 rounded-lg px-2 py-1.5 text-caption font-bold transition ${
                effectiveMode === "llm" ? "bg-white text-violet-800 shadow-sm" : "text-ink-muted"
              }`}
            >
              智能问答
            </button>
          </div>
        ) : null}
      </header>

      <div ref={listRef} className="scrollbar-primary-mint min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-small leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-600 text-white"
                  : m.source === "pending"
                    ? "bg-gray-50 text-ink-muted ring-1 ring-black/[0.06]"
                    : "bg-violet-50/90 text-ink ring-1 ring-violet-200/60"
              }`}
            >
              {m.source === "pending" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" {...CUTE_ICON} aria-hidden />
                  {m.text}
                </span>
              ) : (
                m.text
              )}
              {m.source === "llm" ? (
                <p className="mt-2 border-t border-violet-200/60 pt-1.5 text-[0.6rem] text-ink-subtle">{disclaimer}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <footer className="shrink-0 border-t border-black/[0.06] px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {TUTOR_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={sending}
              onClick={() => void sendText(c.prompt)}
              className="rounded-full bg-violet-100/90 px-2.5 py-1 text-caption font-bold text-violet-900 ring-1 ring-violet-200/80 transition hover:bg-violet-100 disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>
        {effectiveMode === "llm" ? (
          <p className="mb-2 text-center text-[0.6rem] text-ink-subtle">
            本轮 {userTurns}/{maxRounds} 轮
          </p>
        ) : null}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendText(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="描述不会的题，或说「分析当前错题」…"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-surface-page/50 px-3 text-small text-ink outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-200/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm disabled:opacity-50"
            aria-label="发送"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} />
            ) : (
              <Send className="h-4 w-4" {...CUTE_ICON} />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}
