"""口算小数卷：串题误判、小数/分数等价、小数点错位。"""
import unittest
from fractions import Fraction

from math_correct import (
    _decimal_point_shift_places,
    apply_decimal_ocr_correction,
    build_correct_steps,
    consolidate_decimal_correction_reason,
    diagnose_decimal_point_error,
    extract_math_value,
    is_likely_missed_decimal_ocr,
    lacks_effective_student_response,
    looks_like_copied_other_question,
    normalize_question,
    recover_decimal_ocr_value,
    student_answer_matches_expr,
    values_equal,
)


class TestDecimalOralGrading(unittest.TestCase):
    def test_not_copied_other_when_answer_only(self):
        expr = "800×1.25"
        self.assertFalse(looks_like_copied_other_question(expr, "1000", ""))
        self.assertFalse(looks_like_copied_other_question(expr, "800×1.25=1000", ""))

    def test_effective_single_decimal_answer(self):
        self.assertFalse(lacks_effective_student_response("0.21×7", "1.47", ""))
        self.assertTrue(student_answer_matches_expr("0.21×7", "1.47", ""))

    def test_fraction_decimal_equal(self):
        self.assertTrue(values_equal(Fraction(21, 10), extract_math_value("2.1")))
        self.assertTrue(values_equal(extract_math_value("21/10"), extract_math_value("2.10")))

    def test_decimal_point_diagnosis(self):
        std = Fraction(147, 100)
        msg = diagnose_decimal_point_error(
            std, Fraction(147, 10), "0.21×7", "14.7"
        )
        self.assertIsNotNone(msg)
        self.assertIn("向右多移了一位", msg)
        self.assertIn("1.47", msg)
        self.assertIn("14.7", msg)

    def test_decimal_point_shift_two_places(self):
        cases = [
            ("800×1.25", Fraction(1000), Fraction(100000), "两位", "1000", "100000", "100000"),
            ("6.5×0.2", Fraction(13, 10), 130, "两位", "1.3", "130", "130.0"),
            ("0.06×500", 30, 3000, "两位", "30", "3000", "3000.0"),
            ("20×0.51", Fraction(51, 5), 1020, "两位", "10.2", "1020", "1020.0"),
        ]
        for expr, std, stu, shift_word, std_txt, stu_txt, raw in cases:
            with self.subTest(expr=expr):
                self.assertEqual(_decimal_point_shift_places(std, stu), 2)
                msg = diagnose_decimal_point_error(
                    std, stu, expr, raw, ocr_forgiving=False
                )
                self.assertIsNotNone(msg)
                self.assertIn(shift_word, msg)
                self.assertIn(std_txt, msg)
                self.assertIn(stu_txt, msg)

    def test_decimal_point_shift_one_place(self):
        cases = [
            ("30×0.3", 9, 90, "一位", "9", "90", "90.0"),
            ("3.1×9", Fraction(279, 10), 279, "一位", "27.9", "279", "279.0"),
            ("11×0.9", Fraction(99, 10), 99, "一位", "9.9", "99", "99.0"),
            ("6.2×20", 124, 1240, "一位", "124", "1240", "1240.0"),
        ]
        for expr, std, stu, shift_word, std_txt, stu_txt, raw in cases:
            with self.subTest(expr=expr):
                self.assertEqual(_decimal_point_shift_places(std, stu), 1)
                msg = diagnose_decimal_point_error(
                    std, stu, expr, raw, ocr_forgiving=False
                )
                self.assertIsNotNone(msg)
                self.assertIn(shift_word, msg)
                self.assertIn(std_txt, msg)
                self.assertIn(stu_txt, msg)

    def test_calculation_error_not_decimal_point(self):
        msg = diagnose_decimal_point_error(
            Fraction(56, 100), Fraction(56056, 1000), "0.4×1.4", "56.056"
        )
        self.assertIsNone(msg)

    def test_apply_decimal_ocr_correction_rewrites_answer(self):
        work, ans = apply_decimal_ocr_correction("6.5×0.2", "6.5×0.2=130", "130")
        self.assertEqual(ans, "1.3")
        self.assertIn("1.3", work)

    def test_rounded_product_accepted(self):
        work = "0.56×0.4=0.224=0.22"
        q = normalize_question(
            {
                "id": 35,
                "expr": "0.56×0.4",
                "student_work": work,
                "student_answer": "0.22",
                "expected_answer": "28/125",
                "status": "错误",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "保留两位小数合理，但结果错误。",
            }
        )
        self.assertEqual(q["status"], "正确")
        self.assertNotIn("28/125", q["reason"])

    def test_ocr_missed_decimal_recovered_as_correct(self):
        cases = [
            ("800×1.25", "100000", "100000", 1000),
            ("6.5×0.2", "130", "130", Fraction(13, 10)),
            ("1.2×6", "72", "72", Fraction(72, 10)),
            ("0.21×7", "147", "147", Fraction(147, 100)),
            ("0.4×1.4", "56.056", "56.056", Fraction(56, 100)),
        ]
        for expr, work, ans, std in cases:
            with self.subTest(expr=expr):
                self.assertTrue(is_likely_missed_decimal_ocr(std, extract_math_value(ans), expr, ans))
                q = normalize_question(
                    {
                        "id": 1,
                        "expr": expr,
                        "student_work": work,
                        "student_answer": ans,
                        "status": "错误",
                        "process_score": 0,
                        "result_score": 0,
                        "structure_score": 0,
                        "reason": "【小数点位置错误】小数点向右多移了两位。",
                    }
                )
                self.assertEqual(q["status"], "正确", msg=q.get("reason"))
                self.assertGreaterEqual(q["total_score"], 9)

    def test_decimal_point_reason_format_real_error(self):
        self.assertIsNone(
            recover_decimal_ocr_value(1000, 10000, "800×1.25", "10000")
        )
        q = normalize_question(
            {
                "id": 4,
                "expr": "800×1.25",
                "student_work": "10000",
                "student_answer": "10000",
                "status": "错误",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "结果错误",
            }
        )
        self.assertEqual(q["status"], "错误")
        self.assertIn("小数点", q["reason"])
        self.assertIn("1000", q["reason"])
        self.assertNotIn("/", q["reason"])

    def test_approximate_steps_use_decimal(self):
        steps = build_correct_steps("0.56×0.4", "0.56×0.4=0.224=0.22")
        self.assertIn("0.22", steps)
        self.assertNotIn("/", steps)

    def test_consolidate_single_error_tag(self):
        reason = consolidate_decimal_correction_reason(
            "6.5×0.2",
            "130",
            "130",
            "错误",
            "【过程正确、结果错误】结果不对。【小数点位置错误】小数点向右多移了两位。",
        )
        self.assertEqual(reason.count("【小数点位置错误】"), 1)
        self.assertNotIn("过程正确、结果错误", reason)

    def test_decimal_point_not_unanswered(self):
        q = normalize_question(
            {
                "id": 1,
                "expr": "0.21×7",
                "student_work": "14.7",
                "student_answer": "14.7",
                "status": "未作答",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "识别为相邻题",
            }
        )
        self.assertNotEqual(q["status"], "未作答")
        self.assertEqual(q["result_score"], 0)
        self.assertIn("小数点", q["reason"])

    def _approx_contradiction_case(self, qid, expr, work, ans, exact, reason):
        q = normalize_question(
            {
                "id": qid,
                "expr": expr,
                "student_work": work,
                "student_answer": ans,
                "expected_answer": exact,
                "status": "错误",
                "process_score": 4,
                "result_score": 0,
                "structure_score": 0,
                "reason": reason,
            }
        )
        self.assertEqual(q["status"], "正确", msg=f"Q{qid}: {q['reason']}")
        self.assertGreaterEqual(q["total_score"], 9)
        self.assertNotIn("订正提示", q["reason"])
        self.assertNotIn("标准答案不一致", q["reason"])
        self.assertNotIn("/", q["reason"])
        return q

    def test_approximate_one_decimal_place(self):
        reason = (
            "先算精确积 1.32，再保留一位小数得 1.3，符合要求"
            "（订正提示：末步结果与标准答案不一致，已按规则计为错误并保留部分过程分。）"
        )
        q = self._approx_contradiction_case(
            34, "1.1×1.2", "1.1×1.2=1.32=1.3", "1.3", "1.32", reason
        )
        self.assertEqual(q["expected_answer"], "1.3")

    def test_approximate_two_decimal_places(self):
        reason = (
            "先算精确积 0.224，再保留两位小数得 0.22，符合要求"
            "（订正提示：末步结果与标准答案不一致，已按规则计为错误并保留部分过程分。）"
        )
        q = self._approx_contradiction_case(
            35, "0.56×0.4", "0.56×0.4=0.224=0.22", "0.22", "0.224", reason
        )
        self.assertEqual(q["expected_answer"], "0.22")

    def test_approximate_one_decimal_14_5(self):
        reason = (
            "先算精确积 14.496，再保留一位小数得 14.5，符合要求"
            "（订正提示：末步结果与标准答案不一致，已按规则计为错误并保留部分过程分。）"
        )
        q = self._approx_contradiction_case(
            36, "3.2×4.53", "3.2×4.53=14.496=14.5", "14.5", "14.496", reason
        )
        self.assertEqual(q["expected_answer"], "14.5")

    def test_answer_only_rounded_without_work_chain(self):
        q = normalize_question(
            {
                "id": 40,
                "expr": "0.56×0.4",
                "student_work": "",
                "student_answer": "0.22",
                "expected_answer": "0.224",
                "status": "未作答",
                "process_score": 0,
                "result_score": 0,
                "structure_score": 0,
                "reason": "保留两位小数得 0.22，符合要求",
            }
        )
        self.assertNotEqual(q["status"], "未作答")
        self.assertEqual(q["status"], "正确")


if __name__ == "__main__":
    unittest.main()
