"""参考答案传入批改上下文。"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from math_correct import _teacher_context_suffix_math
from english_essay import _teacher_context_suffix_english


class AnswerKeyGradingTests(unittest.TestCase):
    def test_math_suffix_includes_answer_key(self):
        s = _teacher_context_suffix_math("", "", answer_key="第1题：42\n第2题：3/4")
        self.assertIn("参考答案", s)
        self.assertIn("42", s)

    def test_math_suffix_with_answer_key_image(self):
        s = _teacher_context_suffix_math("", "", has_answer_key_image=True)
        self.assertIn("附图", s)

    def test_english_suffix_includes_answer_key(self):
        s = _teacher_context_suffix_english("", "", "", answer_key="范文要点：环保")
        self.assertIn("参考答案", s)
        self.assertIn("环保", s)


if __name__ == "__main__":
    unittest.main()
