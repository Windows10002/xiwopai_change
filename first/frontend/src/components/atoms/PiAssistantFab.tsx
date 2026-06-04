import { useState } from "react";

import { FabHelp } from "@/components/atoms/FabHelp";
import { PiAssistantDrawer } from "@/components/organisms/PiAssistantDrawer";

type PiAssistantFabProps = {
  show?: boolean;
};

/** 右下角 IP：打开 π 智能助手抽屉 */
export function PiAssistantFab({ show = true }: PiAssistantFabProps) {
  const [open, setOpen] = useState(false);
  if (!show) return null;
  return (
    <>
      <FabHelp onClick={() => setOpen(true)} ariaLabel="π 智能助手" />
      <PiAssistantDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
