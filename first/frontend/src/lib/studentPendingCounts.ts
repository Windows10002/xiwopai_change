import { countWrongBookItems } from "@/lib/wrongQuestionBook";
import { loadStudentProfileName } from "@/lib/studentProfileName";
import { fetchMySubmissions, fetchStudentTodo } from "@/lib/workspaceApi";

export type StudentPendingCounts = {
  todoCount: number;
  /** 教师已批改、待下发给学生查看 */
  pendingReleaseCount: number;
  /** 未完成变式题 */
  variantsPendingCount: number;
  wrongBookCount: number;
  /** 首页「待处理」条合计（不含错题本） */
  actionTotal: number;
};

const EMPTY: StudentPendingCounts = {
  todoCount: 0,
  pendingReleaseCount: 0,
  variantsPendingCount: 0,
  wrongBookCount: 0,
  actionTotal: 0,
};

export async function loadStudentPendingCounts(): Promise<StudentPendingCounts> {
  const wrongBookCount = countWrongBookItems();
  const name = loadStudentProfileName().trim();
  if (!name) {
    return { ...EMPTY, wrongBookCount };
  }
  try {
    const [todoData, workData] = await Promise.all([fetchStudentTodo(name), fetchMySubmissions(name)]);
    const todoCount = todoData.todo.length;
    const pendingReleaseCount = workData.pending_release.length;
    const variantsPendingCount = workData.variant_tasks.filter((v) => v.status === "assigned").length;
    return {
      todoCount,
      pendingReleaseCount,
      variantsPendingCount,
      wrongBookCount,
      actionTotal: todoCount + pendingReleaseCount + variantsPendingCount,
    };
  } catch {
    return { ...EMPTY, wrongBookCount };
  }
}
