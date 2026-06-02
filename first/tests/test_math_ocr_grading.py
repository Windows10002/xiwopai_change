"""第 1、4 题 OCR 误识与评语矛盾时的本地判分回归。"""
import unittest
from fractions import Fraction

from math_correct import (
    extract_math_value,
    maybe_fix_expr_from_student_numeric,
    normalize_question,
    safe_eval_math_expr,
    split_equation_steps,
    student_solution_arithmetically_correct,
)


class TestOcrGradingRegression(unittest.TestCase):
  def test_q1_den7_ocr_fix_and_correct(self):
    expr_wrong = "-32 1/3-5.25-(-3 1/4)+5 1/4-(-2 6/4)"
    work = "解：原式=-32 1/3+6=-26 1/3"
    ans = "-26 1/3"
    fixed = maybe_fix_expr_from_student_numeric(expr_wrong, work, ans)
    self.assertIn("1/7", fixed)
    self.assertNotIn("3 1/4", fixed)
    self.assertTrue(student_solution_arithmetically_correct(fixed, work, ans))
    q = normalize_question(
      {
        "id": 1,
        "expr": expr_wrong,
        "student_work": work,
        "student_answer": ans,
        "expected_answer": "-25 2/3",
        "status": "错误",
        "process_score": 0,
        "result_score": 0,
        "structure_score": 0,
        "reason": "过程合理且结果正确，但与按题干重算的标准答案不一致。",
      }
    )
    self.assertEqual(q["status"], "正确")
    self.assertGreaterEqual(q["total_score"], 9)

  def test_q4_chinese_mixed_and_colon_label(self):
    work = "解：原式=12÷(-2/12-3/12+16/12)=12×12/11=13又1/11"
    self.assertEqual(extract_math_value("13又1/11"), Fraction(144, 11))
    steps = split_equation_steps(work)
    self.assertFalse(steps and steps[0] == "/")
    expr = "12÷(-1/6-1/4+1/3)"
    self.assertTrue(
      student_solution_arithmetically_correct(
        maybe_fix_expr_from_student_numeric(expr, work, "13又1/11"), work, "13又1/11"
      )
    )
    q = normalize_question(
      {
        "id": 4,
        "expr": expr,
        "student_work": work,
        "student_answer": "13又1/11",
        "expected_answer": "36",
        "status": "错误",
        "process_score": 0,
        "result_score": 0,
        "structure_score": 0,
        "reason": "正确步骤：12÷(-1/6-1/4+1 1/3)=144/11。过程正确。",
      }
    )
    self.assertEqual(q["status"], "正确")
    self.assertNotIn("卷面该题作答", q["reason"])

  def test_q4_plus_one_third_ocr_fix(self):
    expr_wrong = "12÷(-1/6-1/4+1/3)"
    work = "解：原式=12÷(-2/12-3/12+16/12)=12×12/11=144/11"
    ans = "144/11"
    fixed = maybe_fix_expr_from_student_numeric(expr_wrong, work, ans)
    self.assertIn("1 1/3", fixed)
    std = safe_eval_math_expr(fixed)
    self.assertTrue(student_solution_arithmetically_correct(fixed, work, ans))
    q = normalize_question(
      {
        "id": 4,
        "expr": expr_wrong,
        "student_work": work,
        "student_answer": ans,
        "expected_answer": "36",
        "status": "错误",
        "process_score": 6,
        "result_score": 0,
        "structure_score": 1,
        "reason": "过程正确，但作答与过程不一致。",
      }
    )
    self.assertEqual(q["status"], "正确")
    self.assertGreaterEqual(q["total_score"], 9)
    self.assertEqual(safe_eval_math_expr(q["expr"]), std)


if __name__ == "__main__":
  unittest.main()
