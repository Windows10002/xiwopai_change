import { withAuthSlot } from "@/lib/authSlot";

export type MyWorkTabId = "todo" | "work" | "variants";

export function parseMyWorkTab(raw: string | null): MyWorkTabId {
  if (raw === "work" || raw === "variants" || raw === "todo") return raw;
  return "todo";
}

export function myWorkPath(tab?: MyWorkTabId): string {
  if (!tab || tab === "todo") return withAuthSlot("/my-work");
  return withAuthSlot(`/my-work?tab=${tab}`);
}

export function todoPath(): string {
  return withAuthSlot("/todo");
}

export function wrongBookPath(): string {
  return withAuthSlot("/wrong-book");
}

export function rewardsPath(): string {
  return withAuthSlot("/rewards");
}

export function piTutorPath(): string {
  return withAuthSlot("/pi-tutor");
}
