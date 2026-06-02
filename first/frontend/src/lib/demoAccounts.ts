import type { AppUserRole } from "@/lib/appSession";

export type DemoAccountRow = {
  account: string;
  password: string;
  role: AppUserRole;
  displayName: string;
  studentGrade?: number;
  teachingGrades?: string;
  roleLabel: string;
};

/** 与后端 core/demo_accounts.py 保持一致 */
export const DEMO_ACCOUNTS: DemoAccountRow[] = [
  {
    account: "13800138001",
    password: "123456",
    role: "teacher",
    displayName: "李老师",
    teachingGrades: "七年级、八年级",
    roleLabel: "教师端",
  },
  {
    account: "13800138002",
    password: "123456",
    role: "parent",
    displayName: "张三家长",
    roleLabel: "家长端",
  },
  {
    account: "13800138003",
    password: "123456",
    role: "student",
    displayName: "张三",
    studentGrade: 7,
    roleLabel: "学生端",
  },
  {
    account: "13800138004",
    password: "123456",
    role: "student",
    displayName: "李四",
    studentGrade: 9,
    roleLabel: "学生端",
  },
  {
    account: "13800138005",
    password: "123456",
    role: "admin",
    displayName: "王教务",
    roleLabel: "教务端",
  },
];

export function findDemoAccount(account: string): DemoAccountRow | undefined {
  return DEMO_ACCOUNTS.find((a) => a.account === account.trim());
}
