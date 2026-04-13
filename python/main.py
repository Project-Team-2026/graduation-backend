import sys
import json
from pipelines.png_converter.png_converter import pdf_image_converter
from pipelines.preprocess.preprocess import preprocess
from pipelines.id_detection.id_detection import run_id_detection

image_path = sys.argv[1]
mode = sys.argv[2]

response = {}

if mode == "png_converter":
    result = pdf_image_converter(image_path)

    if not result.get("success") or len(result.get("data", [])) == 0:
        response["success"] = False
        response["data"] = result.get("message", "Unknown error")
        print(json.dumps(response))
        sys.exit(1)
    
    response["success"] = True
    response["data"] = result.get("data", [])

elif mode == "preprocess":
    result = preprocess(image_path)
    if not result.get("success"):
        response["success"] = False
        response["data"] = result.get("message", "Preprocessing failed")
        print(json.dumps(response))
        sys.exit(1)
    
    response["success"] = True
    response["data"] = "preprocessing completed successfully on image: " + str(image_path)


elif mode == "detect_id":
    result = run_id_detection(image_path)
    response["success"] = True
    response["data"] = result

    

elif mode == "detect_answers":
    response["detect_answers"] = detect_answers(image_path)
    response["success"] = True

else:
    response["success"] = False
    response["data"] = "Wrong task"
print(json.dumps(response))