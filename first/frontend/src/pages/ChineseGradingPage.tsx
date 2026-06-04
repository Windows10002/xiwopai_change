import { GradingWorkspace } from "@/components/organisms/GradingWorkspace";
import { ProtectedGradingRoute } from "@/components/organisms/ProtectedGradingRoute";

export function ChineseGradingPage() {
  return (
    <ProtectedGradingRoute>
      <GradingWorkspace
        subjectLabel="语文作业"
        uploadTitle="拖放语文作业照片到此处"
        uploadHint="支持 JPG / PNG / WebP / BMP / GIF；建议正对纸张、光线均匀。"
        subject="chinese"
      />
    </ProtectedGradingRoute>
  );
}
