"""口算练习卷：未作答 / 末步算错 / 括号结构错误 回归。"""
import unittest
from fractions import Fraction

from math_correct import (
    detect_expression_structure_violation,
    lacks_effective_student_response,
    normalize_question,
    student_solution_arithmetically_correct,
)


class TestParenWorksheetGrading(unittest.TestCase):
    def test_q9_blank_unanswered(self):
        self.assertTrue(lacks_effective_student_response("979÷(144-133)", "", ""))
        q = normalize_question(
            {
                "id": 9,
                "expr": "979÷(144-133)",
                "student_work": "",
                "student_answer": "",
                "status": "正确",
                "process_score": 6,
                "result_score": 3,
                "structure_score": 1,
                "reason": "书写工整、关键步骤交代清楚。",
            }
        )
        self.assertEqual(q["status"], "未作答")
        self.assertEqual(q["total_score"], 0)

    def test_q12_last_division_wrong(self):
        work = "=(608+368)÷8=976÷8=120"
        expr = "(608+368)÷8"
        self.assertFalse(student_solution_arithmetically_correct(expr, work, "120"))
        q = normalize_question(
            {
                "id": 12,
                "expr": expr,
                "student_work": work,
                "student_answer": "120",
                "status": "正确",
                "process_score": 6,
                "result_score": 3,
                "structure_score": 1,
                "reason": "括号内加法正确，除法计算无误，结果准确。",
            }
        )
        self.assertEqual(q["status"], "错误")
        self.assertEqual(q["result_score"], 0)
        self.assertGreaterEqual(q["process_score"], 4)
        self.assertIn("过程正确、结果错误", q["reason"])

    def test_q13_structure_violation(self):
        expr = "22×(16+21)"
        work = "=(22+16)×21=38×21=798"
        self.assertTrue(detect_expression_structure_violation(expr, work))
        q = normalize_question(
            {
                "id": 13,
                "expr": expr,
                "student_work": work,
                "student_answer": "798",
                "status": "过程不规范",
                "process_score": 5,
                "result_score": 2,
                "structure_score": 1,
                "reason": "虽然中间有跳步，但最终书写略乱但可读。",
            }
        )
        self.assertEqual(q["status"], "错误")
        self.assertEqual(q["process_score"], 0)
        self.assertEqual(q["result_score"], 0)
        self.assertIn("解题逻辑错误", q["reason"])

    def test_q13_standard_value(self):
        from math_correct import safe_eval_math_expr

        self.assertEqual(safe_eval_math_expr("22×(16+21)"), Fraction(814))


if __name__ == "__main__":
    unittest.main()
