import { loadGradingHistory, type GradingHistoryEntry } from "@/lib/gradingHistory";
import { loadStudentRoster } from "@/lib/studentRoster";
import { assignVariantTasks, fetchTeacherInbox, type WorkspaceSubmission } from "@/lib/workspaceApi";
import type { GradingResultDetail } from "@/types/grading";

export type VariantDispatchScope = "weak_knowledge" | "wrong_on_item";

export type VariantTaskPayload = {
  knowledge_point: string;
  stem: string;
  answer_hint: string;
};

export type VariantDispatchTarget = {
  studentName: string;
  submissionId: string;
};

function normName(name: string): string {
  return name.trim().toLowerCase();
}

function gradeMatches(studentGrade: string | undefined, targetGrade: string | undefined): boolean {
  if (!targetGrade?.trim()) return true;
  const t = targetGrade.trim();
  const s = (studentGrade ?? "").trim();
  if (!s) return false;
  if (s === t) return true;
  if (s.includes(t) || t.includes(s)) return true;
  const gradeNum = t.match(/(\d{1,2})\s*年级/);
  if (gradeNum && s.includes(gradeNum[1]!)) return true;
  return false;
}

function classNameMatches(studentClass: string | undefined, targetClass: string): boolean {
  const a = (studentClass ?? "").trim();
  const b = targetClass.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const gradeNum = b.match(/(\d{1,2})\s*年级/);
  if (gradeNum && a.includes(gradeNum[1]!)) return true;
  return false;
}

function knowledgeMatches(tag: string, knowledgePoint: string): boolean {
  const a = tag.trim();
  const b = knowledgePoint.trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  return false;
}

function entryWeakTags(entry: GradingHistoryEntry): string[] {
  const tags = entry.detail.weakKnowledgeTags ?? [];
  const fromDims = entry.detail.dimensions
    .filter((d) => d.status === "错误" || d.status === "未作答" || d.status === "过程不规范")
    .map((d) => d.label);
  return [...tags, ...fromDims];
}

function entryHasWrongOnKnowledge(detail: GradingResultDetail, knowledgePoint: string): boolean {
  const tags = detail.weakKnowledgeTags ?? [];
  if (tags.some((t) => knowledgeMatches(t, knowledgePoint))) return true;
  const bad = detail.dimensions.filter(
    (d) => d.status === "错误" || d.status === "未作答" || d.status === "过程不规范",
  );
  if (!bad.length) return detail.scorePercent < 85;
  if (bad.some((d) => knowledgeMatches(d.label, knowledgePoint))) return true;
  return bad.length > 0 && knowledgePoint.length > 0;
}

function studentNamesInClasses(classNames: string[], subject: "math" | "english"): Set<string> {
  const names = new Set<string>();
  const roster = loadStudentRoster();
  const history = loadGradingHistory().filter((e) => e.subject === subject);

  for (const className of classNames) {
    for (const s of roster) {
      if (!s.name.trim()) continue;
      if (classNameMatches(s.className, className)) names.add(s.name.trim());
    }
    for (const e of history) {
      if (!e.studentName?.trim()) continue;
      if (classNameMatches(e.gradeLevel, className) || gradeMatches(e.gradeLevel, className)) {
        names.add(e.studentName.trim());
      }
    }
  }

  if (names.size === 0 && classNames.length > 0) {
    for (const s of roster) {
      if (s.name.trim()) names.add(s.name.trim());
    }
  }

  return names;
}

function historyStudentNamesForScope(
  scope: VariantDispatchScope,
  opts: {
    subject: "math" | "english";
    gradeLevel?: string;
    knowledgePoint: string;
    batchEntries: Array<{ fileName: string; detail: GradingResultDetail; studentName?: string }>;
    currentStudentName?: string;
  },
): Set<string> {
  const names = new Set<string>();
  const history = loadGradingHistory().filter((e) => e.subject === opts.subject);

  if (scope === "weak_knowledge") {
    for (const e of history) {
      if (!e.studentName?.trim()) continue;
      if (entryWeakTags(e).some((t) => knowledgeMatches(t, opts.knowledgePoint))) {
        names.add(e.studentName.trim());
      }
    }
    return names;
  }

  if (opts.currentStudentName?.trim()) {
    const cur = opts.currentStudentName.trim();
    const curEntry = opts.batchEntries.find((e) => e.studentName === cur) ?? opts.batchEntries[0];
    if (curEntry && entryHasWrongOnKnowledge(curEntry.detail, opts.knowledgePoint)) {
      names.add(cur);
    }
  }

  for (const row of opts.batchEntries) {
    const name = row.studentName?.trim();
    if (!name) continue;
    if (entryHasWrongOnKnowledge(row.detail, opts.knowledgePoint)) names.add(name);
  }

  for (const e of history) {
    if (!e.studentName?.trim()) continue;
    if (entryHasWrongOnKnowledge(e.detail, opts.knowledgePoint)) {
      names.add(e.studentName.trim());
    }
  }

  return names;
}

function pickSubmissionForStudent(
  studentName: string,
  inbox: WorkspaceSubmission[],
): WorkspaceSubmission | null {
  const key = normName(studentName);
  const matched = inbox.filter((s) => normName(s.student_name) === key && s.grading_record?.result);
  if (!matched.length) return null;
  return matched.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at))[0]!;
}

async function resolveTargetsFromNames(
  nameSet: Set<string>,
  opts: {
    currentStudentName?: string;
    currentSubmissionId?: string;
    scope?: VariantDispatchScope;
  },
): Promise<{ targets: VariantDispatchTarget[]; missingStudents: string[] }> {
  if (opts.scope === "wrong_on_item" && opts.currentSubmissionId && opts.currentStudentName?.trim()) {
    return {
      targets: [
        {
          studentName: opts.currentStudentName.trim(),
          submissionId: opts.currentSubmissionId,
        },
      ],
      missingStudents: [],
    };
  }

  const inbox = (await fetchTeacherInbox()).items;
  const targets: VariantDispatchTarget[] = [];
  const missingStudents: string[] = [];

  for (const name of nameSet) {
    const sub = pickSubmissionForStudent(name, inbox);
    if (sub?.id) {
      targets.push({ studentName: name, submissionId: sub.id });
    } else {
      missingStudents.push(name);
    }
  }

  return { targets, missingStudents };
}

export async function resolveVariantDispatchTargets(
  scope: VariantDispatchScope,
  opts: {
    subject: "math" | "english";
    gradeLevel?: string;
    knowledgePoint: string;
    batchEntries: Array<{ fileName: string; detail: GradingResultDetail; studentName?: string }>;
    currentStudentName?: string;
    currentSubmissionId?: string;
  },
): Promise<{ targets: VariantDispatchTarget[]; missingStudents: string[] }> {
  const nameSet = historyStudentNamesForScope(scope, opts);

  if (scope === "wrong_on_item" && opts.currentStudentName?.trim()) {
    nameSet.add(opts.currentStudentName.trim());
  }

  return resolveTargetsFromNames(nameSet, {
    currentStudentName: opts.currentStudentName,
    currentSubmissionId: opts.currentSubmissionId,
    scope,
  });
}

export async function resolveVariantClassTargets(
  classNames: string[],
  opts: {
    subject: "math" | "english";
  },
): Promise<{ targets: VariantDispatchTarget[]; missingStudents: string[] }> {
  const nameSet = studentNamesInClasses(classNames, opts.subject);
  return resolveTargetsFromNames(nameSet, {});
}

export async function dispatchVariantTask(
  scope: VariantDispatchScope,
  task: VariantTaskPayload,
  opts: Parameters<typeof resolveVariantDispatchTargets>[1],
): Promise<{ sent: number; missingStudents: string[]; errors: string[] }> {
  const { targets, missingStudents } = await resolveVariantDispatchTargets(scope, opts);
  return sendVariantToTargets(targets, missingStudents, task);
}

export async function dispatchVariantToClasses(
  classNames: string[],
  task: VariantTaskPayload,
  opts: { subject: "math" | "english" },
): Promise<{ sent: number; missingStudents: string[]; errors: string[] }> {
  if (!classNames.length) {
    return { sent: 0, missingStudents: [], errors: ["请至少选择一个班级"] };
  }
  const { targets, missingStudents } = await resolveVariantClassTargets(classNames, opts);
  return sendVariantToTargets(targets, missingStudents, task);
}

async function sendVariantToTargets(
  targets: VariantDispatchTarget[],
  missingStudents: string[],
  task: VariantTaskPayload,
): Promise<{ sent: number; missingStudents: string[]; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  for (const t of targets) {
    try {
      await assignVariantTasks(t.submissionId, [task]);
      sent += 1;
    } catch (e) {
      errors.push(`${t.studentName}：${e instanceof Error ? e.message : "发送失败"}`);
    }
  }

  return { sent, missingStudents, errors };
}

export const VARIANT_DISPATCH_SCOPE_LABEL: Record<VariantDispatchScope, string> = {
  weak_knowledge: "发送给该知识点薄弱的学生",
  wrong_on_item: "发送给本题做错的学生",
};
