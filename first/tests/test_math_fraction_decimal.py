"""分数/小数/带分数等价判分回归。"""
import unittest
from fractions import Fraction

from math_correct import (
    algebra_numeric_outcome_ok,
    build_correct_steps,
    detect_invalid_equal_steps,
    extract_final_numeric_value,
    extract_math_value,
    format_expr_for_display,
    format_answer_display,
    normalize_question,
    numeric_outcome_matches,
    student_solution_arithmetically_correct,
    values_equal,
)


class TestFractionDecimalEquivalence(unittest.TestCase):
    def test_fraction_decimal_equal(self):
        self.assertTrue(values_equal(Fraction(144, 11), "13.090909"))
        self.assertTrue(values_equal("-2.25", "-9/4"))
        self.assertTrue(values_equal("21/10", "2.1"))
        self.assertTrue(values_equal(extract_math_value("144/11"), Fraction(144, 11)))
        self.assertTrue(values_equal(extract_math_value("+144/11"), Fraction(144, 11)))

    def test_mixed_fraction_extract(self):
        self.assertEqual(extract_math_value("-2又1/4"), Fraction(-9, 4))
        self.assertEqual(extract_final_numeric_value("=-(1/4)-2=-2.25"), Fraction(-9, 4))

    def test_format_answer_keeps_fraction_on_fraction_sheet(self):
        self.assertIn("/", format_answer_display(Fraction(144, 11), "12÷(-1÷6-1÷4+11÷3)"))

    def test_q4_fraction_answer_vs_decimal_expected(self):
        expr = "12÷(-1÷6-1÷4+11÷3)"
        outcome = numeric_outcome_matches(expr, "=144/11", "144/11", "13.090909")
        self.assertTrue(outcome.get("match"))
        q = normalize_question(
            {
                "expr": expr,
                "student_work": "12÷(-1/6-1/4+11/3)=144/11",
                "student_answer": "144/11",
                "expected_answer": "13.090909",
                "status": "错误",
                "process_score": 4,
                "result_score": 0,
                "structure_score": 0,
                "reason": "末步结果与标准答案不一致",
            }
        )
        self.assertEqual(q["status"], "正确")

    def test_q11_decimal_vs_fraction_expected(self):
        expr = "2x^2-x^2-2xy+2y^2-2x^2+2xy-4y^2"
        work = "化简=-x^2-2y^2; x=1/2,y=-1; 代入得 -(1/4)-2(1)=-2.25"
        self.assertTrue(algebra_numeric_outcome_ok(expr, work, "-2.25", "-9/4"))
        self.assertTrue(student_solution_arithmetically_correct(expr, work, "-2.25", "-9/4"))
        q = normalize_question(
            {
                "expr": expr,
                "student_work": work,
                "student_answer": "-2.25",
                "expected_answer": "-9/4",
                "status": "错误",
                "process_score": 5,
                "result_score": 0,
                "structure_score": 0,
                "reason": "结果正确但末步与标准答案不一致",
            }
        )
        self.assertEqual(q["status"], "正确")

    def test_q4_eleven_twelfths_workflow(self):
        expr = "12÷(-1÷6-1÷4+1 1/3)"
        work = "12÷(-1/6-1/4+11/12)=12×12/11=144/11"
        self.assertNotIn("1÷3", format_expr_for_display(expr))
        self.assertIn("11/12", build_correct_steps(expr, work))
        self.assertNotIn("4又1/12", build_correct_steps(expr, work))
        self.assertNotIn("4 1/12", build_correct_steps(expr, work))
        self.assertEqual(detect_invalid_equal_steps(work, expr, work, student_answer="144/11"), [])
        self.assertTrue(student_solution_arithmetically_correct(expr, work, "144/11", "144/11"))
        q = normalize_question(
            {
                "expr": "12÷(-1÷6-1÷4+11÷3)",
                "student_work": work,
                "student_answer": "144/11",
                "expected_answer": "144/11",
                "status": "错误",
                "process_score": 4,
                "result_score": 0,
                "structure_score": 0,
                "reason": "学生先通分得4又1/12，答案144/11",
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertNotIn("4又1/12", q.get("reason", ""))


if __name__ == "__main__":
    unittest.main()
