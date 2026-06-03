const STORAGE_KEY = "seewo_pi_student_roster_v1";

export type RosterStudent = {
  id: string;
  name: string;
  className?: string;
  studentNo?: string;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadStudentRoster(): RosterStudent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RosterStudent =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as RosterStudent).name === "string" &&
        typeof (x as RosterStudent).id === "string",
    );
  } catch {
    return [];
  }
}

export function saveStudentRoster(list: RosterStudent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
}

export function addRosterStudent(input: { name: string; className?: string; studentNo?: string }): RosterStudent {
  const name = input.name.trim();
  const list = loadStudentRoster();
  const existing = list.find((s) => s.name === name);
  if (existing) return existing;
  const row: RosterStudent = {
    id: randomId(),
    name,
    className: input.className?.trim() || undefined,
    studentNo: input.studentNo?.trim() || undefined,
  };
  saveStudentRoster([row, ...list]);
  return row;
}

export function removeRosterStudent(id: string): void {
  saveStudentRoster(loadStudentRoster().filter((s) => s.id !== id));
}

export function rememberStudentFromGrading(name: string): void {
  const t = name.trim();
  if (!t || t.length < 2) return;
  addRosterStudent({ name: t });
}

/** 演示：七年级 / 八年级示例名册（仅 localStorage 为空时写入） */
export function seedDemoRosterIfEmpty(): RosterStudent[] {
  const existing = loadStudentRoster();
  if (existing.length > 0) return existing;
  const demo: Array<{ name: string; className: string; studentNo: string }> = [
    { name: "张三", className: "七年级1班", studentNo: "20270101" },
    { name: "李四", className: "七年级1班", studentNo: "20270102" },
    { name: "王五", className: "七年级2班", studentNo: "20270201" },
    { name: "赵六", className: "八年级1班", studentNo: "20280101" },
    { name: "钱七", className: "八年级1班", studentNo: "20280102" },
  ];
  const rows = demo.map((d) => ({
    id: randomId(),
    name: d.name,
    className: d.className,
    studentNo: d.studentNo,
  }));
  saveStudentRoster(rows);
  return rows;
}

export function rosterStudentsForClass(className: string): RosterStudent[] {
  const cn = className.trim();
  if (!cn) return loadStudentRoster();
  return loadStudentRoster().filter((s) => (s.className || "").trim() === cn);
}
