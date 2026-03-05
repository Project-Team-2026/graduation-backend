import sys
import json
from pipelines.png_converter.png_converter import pdf_image_converter


image_path = sys.argv[1]
mode = sys.argv[2]

response = {}

if mode == "png_converter":
    result = pdf_image_converter(image_path)

    if not result.get("success") or len(result.get("data", [])) == 0:
        response["success"] = False
        response["message"] = result.get("message", "Unknown error")
        print(json.dumps(response))
        sys.exit(1)
    
    response["success"] = True
    response["data"] = result.get("data", [])

elif mode == "preprocess":
    result["preprocess"] = preprocess(image_path)
    result["success"] = True

elif mode == "detect_id":
    result["detect_id"] = detect_student_id(image_path)
    result["success"] = True

elif mode == "detect_answers":
    result["detect_answers"] = detect_answers(image_path)
    result["success"] = True

print(json.dumps(response))