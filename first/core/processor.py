# core/processor.py

import os
# 导入你现有的批改脚本
import math_correct
import english_essay

def run_grading(subject, image_path):
    """
    统一批改入口
    :param subject: 学科 ('math' 或 'english')
    :param image_path: 图片在服务器上的保存路径
    :return: 标准化的 JSON 数据
    """

    # 1. 模拟调用你的数学脚本
    if subject == 'math':
        # 这里假设你的 math_correct.py 有一个 main 函数接收路径并返回结果
        # 如果没有，你需要把 math_correct.py 里的逻辑封装一下
        result = math_correct.main(image_path)
        return result

    # 2. 模拟调用你的英语脚本
    elif subject == 'english':
        # 同理，假设 english_essay.py 有处理逻辑
        result = english_essay.main(image_path)
        return result

    else:
        return {"error": "不支持的学科"}