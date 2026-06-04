import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { useAppSession } from "@/hooks/useAppSession";
import { useAppNavigate } from "@/hooks/useAppNavigate";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  appendUserMessage,
  buildPiReply,
  buildPiWelcome,
  isProductFeedbackIntent,
  type PiChatMessage,
} from "@/lib/piAssistant/piAssistantEngine";
import { quickChipsForPath } from "@/lib/piAssistant/piPathContext";
import { submitProductFeedback, type ProductFeedbackCategory } from "@/lib/piAssistantApi";
import {
  fetchAssistantConfig,
  maxRoundsForRole,
  postAssistantChat,
  type AssistantChatTurn,
  type AssistantConfig,
} from "@/lib/piAssistantChatApi";
import { saveUserPreferences, type AssistantModePref } from "@/lib/userPreferences";

type PiAssistantDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_QUICK_CHIPS = [
  { label: "找功能", prompt: "我想找功能" },
  { label: "使用帮助", prompt: "怎么拍照上传作业" },
  { label: "反馈建议", prompt: "反馈" },
] as const;

function countUserTurns(messages: PiChatMessage[]) {
  return messages.filter((m) => m.role === "user").length;
}

function toApiTurns(messages: PiChatMessage[]): AssistantChatTurn[] {
  return messages
    .filter((m) => m.role === "user" || (m.role === "assistant" && m.source !== "pending"))
    .map((m) => ({ role: m.role, content: m.text }));
}

export function PiAssistantDrawer({ open, onClose }: PiAssistantDrawerProps) {
  const session = useAppSession();
  const role = session?.role ?? null;
  const location = useLocation();
  const navigate = useAppNavigate();
  const prefs = useUserPreferences();
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | null>(null);
  const [messages, setMessages] = useState<PiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbCategory, setFbCategory] = useState<ProductFeedbackCategory>("idea");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContact, setFbContact] = useState("");
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const pathname = location.pathname;
  const llmAvailable = Boolean(assistantConfig?.llm_available);
  const effectiveMode: AssistantModePref =
    prefs.assistantMode === "llm" && llmAvailable ? "llm" : "rules";
  const maxRounds = assistantConfig ? maxRoundsForRole(assistantConfig, role) : 20;
  const userTurns = countUserTurns(messages);
  const disclaimer = assistantConfig?.disclaimer ?? "仅供参考，以页面实际功能为准。";
  const pageChips = quickChipsForPath(pathname);
  const quickChips = pageChips.length > 0 ? pageChips : DEFAULT_QUICK_CHIPS;

  useEffect(() => {
    if (!open) return;
    void fetchAssistantConfig().then(setAssistantConfig).catch(() => setAssistantConfig(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMessages([buildPiWelcome(role, pathname)]);
    setInput("");
    setShowFeedback(false);
    setFbMessage("");
    setFbContact("");
    setFbDone(false);
    setSending(false);
  }, [open, role, pathname, effectiveMode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showFeedback, sending]);

  const setAssistantMode = (mode: AssistantModePref) => {
    saveUserPreferences({ assistantMode: mode });
  };

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      if (isProductFeedbackIntent(trimmed)) setShowFeedback(true);

      const userMsg = appendUserMessage(trimmed);
      const nextMessages = [...messages, userMsg];

      if (effectiveMode === "rules" || isProductFeedbackIntent(trimmed)) {
        setMessages([...nextMessages, { ...buildPiReply(trimmed, role, pathname), source: "rules" }]);
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
            text: `本轮对话已达 ${maxRounds} 轮上限。请关闭助手后重新开始，或到设置切回「规则模式」。`,
          },
        ]);
        setInput("");
        return;
      }

      const pendingId = `${Date.now()}-pending`;
      setMessages([
        ...nextMessages,
        { id: pendingId, role: "assistant", text: "正在思考…", source: "pending" },
      ]);
      setInput("");
      setSending(true);

      try {
        const apiTurns = toApiTurns(nextMessages);
        const res = await postAssistantChat({
          messages: apiTurns,
          path: pathname,
          role,
        });

        if (res.ok && res.reply) {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== pendingId),
            { id: `${Date.now()}-llm`, role: "assistant", text: res.reply!, source: "llm" },
          ]);
        } else {
          const fallback = buildPiReply(trimmed, role, pathname);
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== pendingId),
            {
              ...fallback,
              source: "rules",
              text: `${res.message || "智能问答暂时不可用，已改用规则回答："}\n\n${fallback.text}`,
            },
          ]);
        }
      } catch (e) {
        const fallback = buildPiReply(trimmed, role, pathname);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== pendingId),
          {
            ...fallback,
            source: "rules",
            text: `${e instanceof Error ? e.message : "网络错误"}，已改用规则回答：\n\n${fallback.text}`,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, effectiveMode, role, pathname, maxRounds],
  );

  const handleSubmitFeedback = async () => {
    if (fbMessage.trim().length < 6) return;
    setFbBusy(true);
    try {
      await submitProductFeedback({
        category: fbCategory,
        message: fbMessage.trim(),
        contact: fbContact,
        path: location.pathname,
        role,
      });
      setFbDone(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-fb`,
          role: "assistant",
          text: "已收到你的反馈，感谢支持希沃智教 π！开发同学会定期查看。",
          source: "rules",
        },
      ]);
      setShowFeedback(false);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          text: e instanceof Error ? e.message : "提交失败，请稍后重试。",
          source: "rules",
        },
      ]);
    } finally {
      setFbBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end" role="dialog" aria-modal="true" aria-label="π 智能助手">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-label="关闭助手"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-black/[0.08] bg-white shadow-[-12px_0_48px_rgba(15,90,75,0.15)]">
        <header className="flex shrink-0 flex-col gap-2 border-b border-black/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            <IpBrandFace size="sm" decorative />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-body font-extrabold text-ink">
                <Sparkles className="h-4 w-4 text-primary" {...CUTE_ICON} aria-hidden />
                π 智能助手
              </p>
              <p className="text-caption text-ink-muted">
                {effectiveMode === "llm" ? "智能问答 · 找功能 · 反馈" : "规则模式 · 找功能 · 反馈"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] text-ink-muted hover:bg-gray-50"
              aria-label="关闭"
            >
              <X className="h-5 w-5" {...CUTE_ICON} />
            </button>
          </div>
          {llmAvailable ? (
            <div
              className="flex rounded-xl bg-surface-page/80 p-0.5 ring-1 ring-black/[0.06]"
              role="tablist"
              aria-label="助手模式"
            >
              <button
                type="button"
                role="tab"
                aria-selected={effectiveMode === "rules"}
                onClick={() => setAssistantMode("rules")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-caption font-bold transition ${
                  effectiveMode === "rules" ? "bg-white text-[#006D41] shadow-sm" : "text-ink-muted"
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
                  effectiveMode === "llm" ? "bg-white text-[#006D41] shadow-sm" : "text-ink-muted"
                }`}
              >
                智能问答
              </button>
            </div>
          ) : null}
        </header>

        <div ref={listRef} className="scrollbar-primary-mint min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-small leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white"
                    : m.source === "pending"
                      ? "bg-gray-50 text-ink-muted ring-1 ring-black/[0.06]"
                      : "bg-primary-tint/80 text-ink ring-1 ring-primary/15"
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
                  <p className="mt-2 border-t border-primary/15 pt-1.5 text-[0.6rem] text-ink-subtle">{disclaimer}</p>
                ) : null}
                {m.actions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <button
                        key={a.to}
                        type="button"
                        onClick={() => {
                          navigate(a.to);
                          onClose();
                        }}
                        className="rounded-full bg-white/95 px-2.5 py-1 text-caption font-bold text-[#006D41] ring-1 ring-primary/25 transition hover:bg-white"
                      >
                        {a.label} →
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {showFeedback ? (
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 p-3 ring-1 ring-sky-100">
              <p className="text-caption font-bold text-sky-950">提交产品反馈</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(
                  [
                    ["bug", "问题/Bug"],
                    ["idea", "功能建议"],
                    ["question", "使用疑问"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFbCategory(v)}
                    className={`rounded-full px-2.5 py-1 text-caption font-bold ${
                      fbCategory === v ? "bg-primary text-white" : "bg-white text-ink-muted ring-1 ring-black/[0.08]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                value={fbMessage}
                onChange={(e) => setFbMessage(e.target.value.slice(0, 2000))}
                rows={3}
                placeholder="请描述遇到的问题或改进建议（至少 6 字）"
                className="mt-2 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-small text-ink outline-none focus:border-primary/35"
              />
              <input
                value={fbContact}
                onChange={(e) => setFbContact(e.target.value.slice(0, 80))}
                placeholder="联系方式（选填）"
                className="mt-2 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-caption text-ink outline-none focus:border-primary/35"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="rounded-lg px-3 py-1.5 text-caption font-bold text-ink-muted"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={fbBusy || fbMessage.trim().length < 6}
                  onClick={() => void handleSubmitFeedback()}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-caption font-bold text-white disabled:opacity-50"
                >
                  {fbBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" {...CUTE_ICON} /> : null}
                  提交
                </button>
              </div>
            </div>
          ) : null}
          {fbDone ? (
            <p className="text-center text-caption text-ink-muted">本次反馈已记录</p>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-black/[0.06] px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickChips.map((c) => (
              <button
                key={c.label}
                type="button"
                disabled={sending}
                onClick={() => void sendText(c.prompt)}
                className="rounded-full bg-primary-tint/90 px-2.5 py-1 text-caption font-bold text-[#006D41] ring-1 ring-primary/20 transition hover:bg-primary-tint disabled:opacity-50"
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
              placeholder={
                effectiveMode === "llm" ? "输入问题，例如：学情和作业管理有什么区别？" : "输入问题，例如：作业管理在哪？"
              }
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-surface-page/50 px-3 text-small text-ink outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm disabled:opacity-50"
              aria-label="发送"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" {...CUTE_ICON} />
              ) : (
                <Send className="h-4 w-4" {...CUTE_ICON} />
              )}
            </button>
          </form>
          <p className="mt-2 text-center text-[0.6rem] text-ink-subtle">
            {effectiveMode === "llm" ? `智能问答 · ${disclaimer}` : `规则助手 · ${disclaimer}`}
          </p>
        </footer>
      </aside>
    </div>
  );
}
