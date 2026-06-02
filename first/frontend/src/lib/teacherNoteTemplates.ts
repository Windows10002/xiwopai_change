const STORAGE_KEY = "seewo_pi_teacher_note_templates_v1";

export const DEFAULT_NOTE_TEMPLATES = [
  "本次为单元测验，侧重过程分与书写规范。",
  "请结合课堂讲解对照订正，重点关注计算步骤。",
  "家长反馈：加强应用题审题与列式。",
  "作文请对照题目要点，注意时态与主谓一致。",
] as const;

export function loadNoteTemplates(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_NOTE_TEMPLATES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_NOTE_TEMPLATES];
    const list = parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return list.length ? list : [...DEFAULT_NOTE_TEMPLATES];
  } catch {
    return [...DEFAULT_NOTE_TEMPLATES];
  }
}

export function saveNoteTemplates(templates: string[]): void {
  const cleaned = templates.map((t) => t.trim()).filter(Boolean).slice(0, 24);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}
