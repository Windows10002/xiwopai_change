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
