import { authSlotLabel, buildSlotUrl, DEV_PARALLEL_LOGIN_SLOTS } from "@/lib/authSlot";

/**
 * 开发环境：一键在新标签打开带独立登录槽的登录页，便于教师/学生端同时调试。
 */
export function DevParallelLoginLinks() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="mt-4 rounded-xl border border-sky-200/90 bg-sky-50/90 p-3.5 text-left ring-1 ring-sky-100">
      <p className="text-caption font-bold text-sky-950">开发：多标签并行登录</p>
      <p className="mt-1 text-[0.65rem] leading-relaxed text-sky-900/90">
        每个链接请用<strong>新标签页</strong>打开并分别登录。登录后地址栏会带上 <code className="text-[0.65rem]">?slot=</code>
        ，请勿去掉；从本页点链接跳转也会自动保留 slot。
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {DEV_PARALLEL_LOGIN_SLOTS.map(({ slot, hint }) => (
          <li key={slot}>
            <a
              href={buildSlotUrl(slot, `/login?role=${slot}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 w-full items-center justify-between gap-2 rounded-lg border border-sky-300/80 bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-sky-950 transition hover:bg-sky-50"
            >
              <span>{authSlotLabel(slot)}端</span>
              <span className="font-normal text-sky-800/80">{hint}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
