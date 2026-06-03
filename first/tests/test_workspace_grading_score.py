import unittest

from core.workspace_grading_score import score_percent_from_result


class WorkspaceGradingScoreTest(unittest.TestCase):
    def test_score_pct(self):
        self.assertEqual(score_percent_from_result({"score_pct": 85}), 85.0)

    def test_questions_avg(self):
        self.assertEqual(
            score_percent_from_result({"questions": [{"total_score": 8}, {"total_score": 6}]}),
            70.0,
        )

    def test_score_string(self):
        self.assertEqual(score_percent_from_result({"score": "8.5/10"}), 85.0)


if __name__ == "__main__":
    unittest.main()
