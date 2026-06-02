import type { AppSession } from "@/lib/appSession";
import { GRADE_LEVEL_OPTIONS } from "@/components/molecules/GradingContextModal";
import { findDemoAccount } from "@/lib/demoAccounts";

const NUMERIC_GRADE_TO_LEVEL: Record<number, string> = {
  1: "小学一年级",
  2: "小学二年级",
  3: "小学三年级",
  4: "小学四年级",
  5: "小学五年级",
  6: "小学六年级",
  7: "初一",
  8: "初二",
  9: "初三",
  10: "高一",
  11: "高二",
  12: "高三",
};

const CN_DIGIT: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function parseChineseGradeNumber(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (t === "十") return 10;
  if (t.startsWith("十") && t.length === 2) {
    const tail = CN_DIGIT[t[1]!];
    return tail != null ? 10 + tail : null;
  }
  if (t.length === 2 && t[0]! in CN_DIGIT && t[1] === "十") {
    return CN_DIGIT[t[0]!]! * 10;
  }
  if (t.length === 1 && t in CN_DIGIT) {
    const n = CN_DIGIT[t]!;
    return n >= 1 && n <= 12 ? n : null;
  }
  return null;
}

function gradeLevelFromTeachingGradesText(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  const arabic = text.match(/(\d{1,2})\s*年级/);
  if (arabic) {
    const n = Number(arabic[1]);
    if (n >= 1 && n <= 12) return NUMERIC_GRADE_TO_LEVEL[n] ?? "";
  }

  const cn = text.match(/([一二三四五六七八九十\d]+)\s*年级/);
  if (cn) {
    const n = parseChineseGradeNumber(cn[1]!);
    if (n != null && n >= 1 && n <= 12) return NUMERIC_GRADE_TO_LEVEL[n] ?? "";
  }

  for (const opt of GRADE_LEVEL_OPTIONS) {
    if (opt.value && text.includes(opt.value)) return opt.value;
  }

  return "";
}

/** 从教师「任教七年级、八年级」等描述解析默认学生年级（取第一个） */
export function defaultGradeLevelForTeacher(session: AppSession | null | undefined): string {
  if (!session || session.role !== "teacher") return "";

  const fromSession = gradeLevelFromTeachingGradesText(session.teachingGrades ?? "");
  if (fromSession) return fromSession;

  const account = session.loginAccount?.trim();
  if (account) {
    const demo = findDemoAccount(account);
    if (demo?.teachingGrades) {
      return gradeLevelFromTeachingGradesText(demo.teachingGrades);
    }
  }

  return "";
}
