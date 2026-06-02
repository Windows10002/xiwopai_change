"""百分数口算/脱式：禁止把 50% 当整数 50 验算。"""
import unittest

from math_correct import (
    convert_percent_literals,
    is_percent_expression_context,
    maybe_fix_expr_missing_percent,
    normalize_question,
    safe_eval_math_expr,
    values_equal,
)


class TestPercentEval(unittest.TestCase):
    def test_convert_percent_literals(self):
        self.assertEqual(convert_percent_literals("0.55-50%"), "0.55-((50)/100)")
        self.assertEqual(convert_percent_literals("1-25%"), "1-((25)/100)")
        self.assertIn("((50)/100)", convert_percent_literals("(5/8-50%)"))
        self.assertEqual(convert_percent_literals("35%×0.2"), "((35)/100)×0.2")
        self.assertEqual(
            convert_percent_literals("36%+47.1%"),
            "((36)/100)+((47.1)/100)",
        )
        self.assertEqual(
            convert_percent_literals("24%÷48%"),
            "((24)/100)÷((48)/100)",
        )

    def test_safe_eval_subtract_percent(self):
        self.assertTrue(values_equal(safe_eval_math_expr("0.55-50%"), 0.05))
        self.assertFalse(values_equal(safe_eval_math_expr("0.55-50"), 0.05))

    def test_safe_eval_one_minus_percent(self):
        self.assertTrue(values_equal(safe_eval_math_expr("1-25%"), 0.75))

    def test_safe_eval_bracket_percent(self):
        expr = "0.8÷[(5/8-50%)÷5/8]"
        self.assertTrue(values_equal(safe_eval_math_expr(expr), 4))

    def test_safe_eval_divide_percent(self):
        self.assertTrue(values_equal(safe_eval_math_expr("66÷33%"), 200))

    def test_safe_eval_leading_percent_mul(self):
        self.assertTrue(values_equal(safe_eval_math_expr("35%×0.2"), 0.07))

    def test_safe_eval_percent_add_mixed(self):
        self.assertTrue(values_equal(safe_eval_math_expr("36%+47.1%"), 0.831))
        self.assertTrue(values_equal(safe_eval_math_expr("80%+110%"), 1.9))
        self.assertTrue(values_equal(safe_eval_math_expr("13%+0.77"), 0.9))

    def test_safe_eval_percent_div(self):
        self.assertTrue(values_equal(safe_eval_math_expr("28%÷0.56"), 0.5))
        self.assertTrue(values_equal(safe_eval_math_expr("24%÷48%"), 0.5))
        self.assertTrue(values_equal(safe_eval_math_expr("30%×30%"), 0.09))

    def test_safe_eval_fraction_minus_percent(self):
        self.assertTrue(values_equal(safe_eval_math_expr("5/8-50%"), 0.125))

    def test_maybe_fix_expr_missing_percent(self):
        expr = "0.55-50"
        work = "0.55-50%=0.05"
        fixed = maybe_fix_expr_missing_percent(expr, work, "")
        self.assertIn("%", fixed)
        self.assertTrue(values_equal(safe_eval_math_expr(fixed), 0.05))

    def test_normalize_student_correct_ai_wrong_standard(self):
        q = normalize_question(
            {
                "expr": "0.55-50%",
                "student_work": "0.55-0.5=0.05",
                "student_answer": "0.05",
                "expected_answer": "-49.45",
                "status": "错误",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "把50%当成了50",
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertTrue(values_equal(safe_eval_math_expr(q["expr"]), 0.05))

    def test_percent_context_detect(self):
        self.assertTrue(is_percent_expression_context("30×75%", "22.5"))

    def test_normalize_student_correct_ai_wrong_leading_percent(self):
        q = normalize_question(
            {
                "expr": "35%×0.2",
                "student_work": "0.07",
                "student_answer": "0.07",
                "expected_answer": "7",
                "status": "错误",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "运算结果应为 7，你写成了 0.07。正确步骤：35%×0.2=7",
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertTrue(values_equal(safe_eval_math_expr(q["expr"]), 0.07))

    def test_normalize_percent_add_ai_wrong(self):
        q = normalize_question(
            {
                "expr": "13%+0.77",
                "student_work": "0.9",
                "student_answer": "0.9",
                "expected_answer": "13.77",
                "status": "错误",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "把13%当成了13",
            }
        )
        self.assertEqual(q["status"], "正确")


if __name__ == "__main__":
    unittest.main()
