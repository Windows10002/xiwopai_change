import { GradingWorkspace } from "@/components/organisms/GradingWorkspace";
import { ProtectedGradingRoute } from "@/components/organisms/ProtectedGradingRoute";

export function MathGradingPage() {
  return (
    <ProtectedGradingRoute>
      <GradingWorkspace
        subjectLabel="数学作业"
        uploadTitle="拖放数学作业照片到此处"
        uploadHint="支持 JPG / PNG / WebP / BMP / GIF；建议正对纸张、光线均匀。"
        subject="math"
      />
    </ProtectedGradingRoute>
  );
}
