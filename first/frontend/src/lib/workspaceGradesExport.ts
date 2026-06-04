import { fetchTeacherAssignments, fetchTeacherInbox } from "@/lib/workspaceApi";

const SUBJECT_CN = { math: "数学", english: "英语", chinese: "语文" } as const;

/** 导出作业管理中的已下发成绩为 CSV（与学情简报互补） */
export async function downloadWorkspaceGradesCsv(): Promise<void> {
  const [assignments, inbox] = await Promise.all([fetchTeacherAssignments(), fetchTeacherInbox()]);
  const published = new Map(
    assignments.filter((a) => a.status === "published").map((a) => [a.id, a]),
  );
  const rows = inbox.items.filter((s) => s.status === "published" || s.score_percent != null);

  const header = ["任务", "学科", "班级", "学生", "状态", "得分%", "提交时间", "文件名"];
  const lines = [header.join(",")];

  for (const s of rows) {
    const task = published.get(s.assignment_id) ?? s.assignment;
    const title = (task?.title ?? s.assignment?.title ?? "").replace(/"/g, '""');
    const subj = task?.subject ? SUBJECT_CN[task.subject] : "";
    const cls = (task?.class_name ?? "").replace(/"/g, '""');
    const name = (s.student_name ?? "").replace(/"/g, '""');
    const file = (s.file_name ?? "").replace(/"/g, '""');
    lines.push(
      [
        `"${title}"`,
        subj,
        `"${cls}"`,
        `"${name}"`,
        s.status,
        s.score_percent ?? "",
        s.created_at?.slice(0, 19) ?? "",
        `"${file}"`,
      ].join(","),
    );
  }

  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `作业成绩_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
