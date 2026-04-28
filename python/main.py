import sys
import json
from pipelines.png_converter.png_converter import pdf_image_converter
from pipelines.preprocess.preprocess import preprocess
from pipelines.id_detection.id_detection_2 import run_id_detection
from pipelines.answer_detection.detect_answers import detect_answers

image_path = sys.argv[1]
mode = sys.argv[2]
if len(sys.argv) > 3:
    num_questions = sys.argv[3]

response = {}

if mode == "png_converter":
    """
    Convert PDF to PNG images

    on success:
        response["success"] = True
        response["data"] = [ img1_url, img2_url, ... ]
        response["pages"] = number of pages
    on failure:
        response["success"] = False
        response["data"] = "Conversion failed"
    """
    result = pdf_image_converter(image_path)

    if not result.get("success") or len(result.get("data", [])) == 0:
        response["success"] = False
        response["data"] = result.get("message", "Unknown error")
        print(json.dumps(response))
        sys.exit(1)
    
    response["success"] = True
    response["data"] = result.get("data", [])
    response["pages"] = result.get("pages", 0)

elif mode == "preprocess":
    """
    Preprocess the image
    
    on success:
        response["success"] = True
        response["data"] = "preprocessing completed successfully on image: " + str(image_path)
        save the preprocessed image to the same directory as the original image
    on failure:
        response["success"] = False
        response["data"] = "Preprocessing failed"
    """
    result = preprocess(image_path)
    if not result.get("success"):
        response["success"] = False
        response["data"] = "Preprocessing failed"
        print(json.dumps(response))
        sys.exit(1)
    
    response["success"] = True
    response["data"] = "preprocessing completed successfully on image: " + str(image_path)


elif mode == "detect_id":
    """
    Detect student ID from the image
    
    on success:
        response["success"] = True
        response["data"] = {
            "student_id": "123456789",
            "warning": True or False
        }
    """
    result = run_id_detection(image_path)
    response["success"] = True
    response["data"] = result

    

elif mode == "detect_answers":
    """
    detect answers from the image

    on success:
        response["success"] = True
        response["data"] = [ 
        q1: [answer1 status, answer2 status, ...],
        q2: [answer1 status, answer2 status, ...],
        ...
        ]

    """
    response["data"] = detect_answers(image_path, int(num_questions) if num_questions else None)
    response["success"] = True

else:
    response["success"] = False
    response["data"] = "Wrong task"

print(json.dumps(response))