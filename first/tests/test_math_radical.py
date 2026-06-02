"""实数章：根式/绝对值计算题判分回归。"""
import unittest

from math_correct import (
    build_correct_steps,
    eval_radical_expression,
    format_radical_answer,
    normalize_math_result,
    normalize_question,
    patch_contradictory_model_verdict,
    radical_answers_equivalent,
    radical_solution_correct,
    reason_claims_student_fully_correct,
    reason_has_contradictory_false_negative,
    safe_eval_math_expr,
)


class TestRadicalGrading(unittest.TestCase):
    def test_safe_eval_must_not_strip_roots(self):
        expr = "sqrt(49)+cbrt(-27)+abs(1-sqrt(2))-sqrt(2)"
        self.assertEqual(safe_eval_math_expr(expr), 19)
        self.assertEqual(eval_radical_expression(expr), 3)

    def test_eval_four_problems(self):
        cases = [
            ("cbrt(27)-(sqrt(16)+sqrt(2))+abs(1-sqrt(2))", -2),
            ("sqrt(49)+cbrt(-27)+abs(1-sqrt(2))-sqrt(2)", 3),
            ("(sqrt(3))**2+abs(1-sqrt(2))-cbrt(-8)-sqrt(4)", None),
            ("sqrt(2)+sqrt(9)-cbrt(8)+abs(sqrt(2)-3)", 4),
        ]
        self.assertEqual(eval_radical_expression(cases[0][0]), -2)
        self.assertEqual(eval_radical_expression(cases[1][0]), 3)
        self.assertTrue(radical_answers_equivalent(eval_radical_expression(cases[2][0]), "sqrt(2)+2"))
        self.assertEqual(eval_radical_expression(cases[3][0]), 4)

    def test_build_correct_steps_not_19(self):
        expr = "sqrt(49)+cbrt(-27)+abs(1-sqrt(2))-sqrt(2)"
        steps = build_correct_steps(expr)
        self.assertIn("3", steps)
        self.assertNotIn("19", steps)

    def test_q1_contradiction(self):
        expr = "cbrt(27)-(sqrt(16)+sqrt(2))+abs(1-sqrt(2))"
        work = "原式=3-(4+√2)+√2-1=-2"
        reason = "学生先算立方根和平方根，再处理括号与绝对值，最后合并同类项，每步成立，结果正确。"
        self.assertTrue(reason_claims_student_fully_correct(reason))
        self.assertTrue(radical_solution_correct(expr, work, "-2", "-2", reason))
        q = normalize_question(
            {
                "expr": expr,
                "student_work": work,
                "student_answer": "-2",
                "expected_answer": "-2",
                "status": "错误",
                "process_score": 4,
                "result_score": 0,
                "structure_score": 0,
                "reason": reason,
            }
        )
        self.assertEqual(q["status"], "正确")

    def test_q2_wrong_expected_19(self):
        expr = "sqrt(49)+cbrt(-27)+abs(1-sqrt(2))-sqrt(2)"
        work = "原式=7-3+√2-1-√2=3"
        q = normalize_question(
            {
                "expr": expr,
                "student_work": work,
                "student_answer": "3",
                "expected_answer": "19",
                "status": "错误",
                "process_score": 4,
                "result_score": 0,
                "structure_score": 0,
                "reason": "结果正确",
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertEqual(q["expected_answer"], format_radical_answer(3))

    def test_q5_sqrt2_plus_2(self):
        expr = "(sqrt(3))**2+abs(1-sqrt(2))-cbrt(-8)-sqrt(4)"
        work = "原式=3+√2-1+2-2=2+√2"
        reason = "学生正确计算平方、立方根、平方根和绝对值，合并后得2+√2，结果正确。"
        self.assertTrue(radical_solution_correct(expr, work, "2+√2", "2+√2", reason))
        q = normalize_question(
            {
                "expr": expr,
                "student_work": work,
                "student_answer": "2+√2",
                "status": "错误",
                "process_score": 5,
                "result_score": 0,
                "structure_score": 0,
                "reason": reason,
            }
        )
        self.assertEqual(q["status"], "正确")

    def test_q5_contradictory_ai_reason_with_correction_hint(self):
        """模型评语自相矛盾：前半肯定全对，括号内又写末步与标准答案不一致。"""
        expr = "(sqrt(3))**2+abs(1-sqrt(2))-cbrt(-8)-sqrt(4)"
        work = "原式=3+√2-1+2-2=2+√2"
        reason = (
            "学生正确计算平方、立方根、平方根和绝对值，合并后得 $2+\\sqrt{2}$，结果正确"
            "（订正提示：末步结果与标准答案不一致，已按规则计为错误并保留部分过程分。）"
        )
        self.assertTrue(reason_has_contradictory_false_negative(reason))
        self.assertTrue(reason_claims_student_fully_correct(reason))
        q = normalize_question(
            {
                "expr": expr,
                "student_work": work,
                "student_answer": "2+√2",
                "status": "错误",
                "process_score": 5,
                "result_score": 0,
                "structure_score": 0,
                "reason": reason,
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertNotIn("订正提示", q["reason"])
        self.assertNotIn("标准答案不一致", q["reason"])

    def test_patch_contradictory_short_circuit_without_student_work(self):
        """仅 reason 自相矛盾、无 student_work 时也应短路改判正确。"""
        reason = (
            "学生正确计算平方、立方根、平方根和绝对值，合并后得 2+√2，结果正确"
            "（订正提示：末步结果与标准答案不一致，已按规则计为错误并保留部分过程分。）"
        )
        q = patch_contradictory_model_verdict(
            {
                "id": 5,
                "expr": "(sqrt(3))**2+abs(1-sqrt(2))-cbrt(-8)-sqrt(4)",
                "student_work": "",
                "student_answer": "",
                "status": "错误",
                "process_score": 5,
                "result_score": 0,
                "structure_score": 0,
                "reason": reason,
            }
        )
        self.assertIsNotNone(q)
        self.assertEqual(q["status"], "正确")
        self.assertGreaterEqual(q["total_score"], 9)

    def test_normalize_math_result_sweep(self):
        reason = (
            "合并后得 2+√2，结果正确"
            "（订正提示：末步结果与标准答案不一致，已按规则计为错误并保留部分过程分。）"
        )
        data = normalize_math_result(
            {
                "questions": [
                    {
                        "id": 5,
                        "expr": "(sqrt(3))**2+abs(1-sqrt(2))-cbrt(-8)-sqrt(4)",
                        "status": "错误",
                        "reason": reason,
                    }
                ]
            }
        )
        self.assertEqual(data["questions"][0]["status"], "正确")

    def test_q5_latex_expr_equivalent(self):
        expr = r"(\sqrt{3})^2 + |1-\sqrt{2}| - \sqrt[3]{-8} - \sqrt{4}"
        work = "原式=3+√2-1+2-2=2+√2"
        self.assertTrue(
            radical_solution_correct(expr, work, "2+√2", "", "合并后得2+√2，结果正确。")
        )

    def test_q6_wrong_expected_2(self):
        expr = "sqrt(2)+sqrt(9)-cbrt(8)+abs(sqrt(2)-3)"
        work = "原式=√2+3-2+3-√2=4"
        q = normalize_question(
            {
                "expr": expr,
                "student_work": work,
                "student_answer": "4",
                "expected_answer": "2",
                "status": "错误",
                "process_score": 4,
                "result_score": 0,
                "structure_score": 0,
                "reason": "过程正确，结果正确",
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertEqual(q["expected_answer"], "4")


if __name__ == "__main__":
    unittest.main()
