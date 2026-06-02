import { MathPrettyText } from "@/components/atoms/MathPrettyText";
import { splitQuestionLabel } from "@/lib/gradingMathLabel";

/** 分项标题：题号中文 + 易读数学排版 */
export function QuestionLabel({ label, className }: { label: string; className?: string }) {
  const { prefix, math } = splitQuestionLabel(label);
  if (!prefix) {
    return <MathPrettyText text={math} className={className} />;
  }
  return (
    <span className={className}>
      <span className="font-medium text-gray-800">{prefix}</span>
      <MathPrettyText text={math} />
    </span>
  );
}
