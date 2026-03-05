import sys
import json
from pipeline import run_pipeline


image_path = sys.argv[1]
mode = sys.argv[2]

result = {}

if mode == "preprocess":
    result["preprocess"] = preprocess(image_path)
    result["success"] = True

elif mode == "detect_id":
    result["detect_id"] = detect_student_id(image_path)
    result["success"] = True

elif mode == "detect_answers":
    result["detect_answers"] = detect_answers(image_path)
    result["success"] = True

print(json.dumps(result))