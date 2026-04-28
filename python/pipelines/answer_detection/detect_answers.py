 
import torch
from PIL import Image
from torchvision import transforms
import torch.nn as nn


import cv2
import numpy as np
import os

from pymupdf.table import bbox_getter



# =========================
# CONFIG
# =========================
 
MODEL_PATH  = r"D:\Graduathion_project\graduation-backend\python\pipelines\answer_detection\bubble_model.pth" 
IMG_SIZE    = 64
CLASS_NAMES = ["ambiguous", "empty", "filled"]
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

SECTIONS = {
    "id_area": {
        "start_x": 925,
        "start_y": 5,
        "w": 470,
        "h": 630
    },

    "answer_area1.1": {
        "start_y": 17,
        "start_x": 200,
        "w": 280,
        "h": 1170,
    },
    "answer_area1.2": {
        "start_y": 17,
        "start_x": 665,
        "w": 280,
        "h": 1170,
    },
    "answer_area1.3":{

        "start_y": 17,
        "start_x": 1130,
        "w": 280,
        "h": 1170,
    },
    "answer_area1.4":{
        "start_y": 17,
        "start_x": 1590,
        "w": 280,
        "h": 1170,
    },
    "answer_area1.5":{
        "start_y": 17,
        "start_x": 2010,
        "w": 280,
        "h": 1170,
    },


    "answer_area2.1":{
    
        "start_y": 37,
        "start_x": 200,
        "w": 280,
        "h": 1170,
        
    },
    "answer_area2.2":{
        
        "start_y": 37,
        "start_x": 665,
        "w": 280,
        "h": 1170,
    },
    "answer_area2.3":{
        "start_y": 37,
        "start_x": 1130,
        "w": 280,
        "h": 1170,
    },
    "answer_area2.4":{
        "start_y": 37,
        "start_x": 1590,
        "w": 280,
        "h": 1170,
        
    },
    "answer_area2.5":{
        "start_y": 37,
        "start_x": 2010,
        "w": 280,
        "h": 1170,
    },

}



# =========================
# IMAGE PROCESSING
# =========================

def preprocess(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        25,
        15
    )

    return binary


def get_left_region(binary, percent=0.05):
    h, w = binary.shape[:2]
    crop_w = int(w * percent)
    return binary[:, :crop_w]


# =========================
# CONTOURS
# =========================
def get_contours(image):
    binary = preprocess(image)
    cropped = get_left_region(binary)

    contours, _ = cv2.findContours(
        cropped,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    return contours


def filter_vertical_rectangles(contours):
    candidates = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 100:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / float(h)

        if aspect_ratio > 2:
            rect_area = w * h
            extent = area / float(rect_area)

            if extent > 0.6:
                candidates.append((x, y, w, h))

    return sorted(candidates, key=lambda r: r[1])


# =========================
# SECTION LOGIC
# =========================
def get_section_bounds(image, section):
    img_h = image.shape[0]

    top = int(section["top_ratio"] * img_h)
    bottom = int(section["bottom_ratio"] * img_h)

    return top, bottom


def filter_candidates_in_section(candidates, top, bottom):
    return [
        (x, y, w, h)
        for (x, y, w, h) in candidates
        if (top - TOLERANCE) <= y <= (bottom + TOLERANCE)
    ]


def compute_y_bounds(selected, section):
    if not selected:
        return None, None

    ys = [y for (_, y, _, _) in selected]

    y1 = max(ys) + section["top_margin"]
    y2 = min(ys) + section["bottom_margin"]

    return y1, y2


# =========================
# AREA BUILDERS
# =========================
def build_id_bounds( y1, y2):
    if y1 is None or y2 is None:
        return None
    

    id_data = SECTIONS.get("id_area")
    x1 = id_data["start_x"]
    x2 = id_data["start_x"] + id_data["w"]

    return (x1, y1, x2, y2)


def build_answer_columns( name, y1, y2):

    if y1 is None or y2 is None:
        return None

    answer_column_data = SECTIONS.get(name)
    x1 = answer_column_data["start_x"]
    x2 = x1 + answer_column_data["w"]

    return (x1, y1, x2, y2)


# =========================
# DEBUG DRAWING
# =========================
def draw_debug(image,candidates, areas):
    debug = image.copy()

    # draw contours
    for i, (x, y, w, h) in enumerate(candidates):
        cv2.rectangle(debug, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(debug, str(i), (x+w+5, y), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 5)

    # draw areas
    for area in areas:

        x1, y1, x2, y2 = area
        roi = image[y1:y2, x1:x2]
        h, w = roi.shape[:2]
        row_h = h // 10
        col_w = w // 5

        cv2.rectangle(debug, (x1, y1), (x2, y2), (255, 0, 0), 3)
        for i in range(1,10):
            cv2.line(debug, (x1, y1 + i * row_h), (x2, y1 + i * row_h), (0, 0, 0), 3)
        for i in range(1,5):
            cv2.line(debug, (x1 + i * col_w, y1), (x1 + i * col_w, y2), (0, 0, 0), 3)

    return debug


# =========================
# MAIN PIPELINE
# =========================
def get_id_area(image):
    """
    Get the ID area from the image.
    
    Args:
        image: The input image
        
    Returns:
        The ID area as a tuple (x1, y1, x2, y2)
    """

    contours = get_contours(image)
    candidates = filter_vertical_rectangles(contours)

    # Find ID area
    id_data = SECTIONS.get("id_area")
    y1 = (candidates[id_data["start_y"]][1]+candidates[id_data["start_y"]-1][1]) //2
    y2 = y1 + id_data["h"]

    ( x1, y1, x2, y2) = build_id_bounds(y1, y2)
    return (x1, y1, x2, y2)

def get_answer_columns( candidates):

    areas = []
    for name, section in SECTIONS.items():
        if name != "id_area":
            y1 = (candidates[section["start_y"]][1]+candidates[section["start_y"]-1][1]) //2
            y2 = y1 + section["h"]
            area = build_answer_columns(name, y1, y2)
            if area:
                areas.append(area)
    
    return areas

def extract_bubbles(image, area, num_questions=10, num_choices=5):
    x1, y1, x2, y2 = area

    roi = image[y1:y2, x1:x2]

    h, w = roi.shape[:2]

    question_h = h // num_questions
    bubble_w = w // num_choices

    questions = []

    for q in range(num_questions):
        question = []

        y_start = q * question_h
        y_end = (q + 1) * question_h

        for c in range(num_choices):
            x_start = c * bubble_w
            x_end = (c + 1) * bubble_w

            bubble = roi[y_start:y_end, x_start:x_end]
            bubble = cv2.resize(bubble, (32, 32))
            question.append(bubble)

        questions.append(question)

    return questions


def extract_all_bubbles(image, areas):
    all_questions = []

    for area in areas:
        questions = extract_bubbles(image, area)
        all_questions.extend(questions)  # Use extend to flatten the list

    return all_questions


def get_questions(image, q_no = 100):

    """
    Process the image and extract bubbles for the specified number of questions.
    If q_no is not provided, extract bubbles for all 100 questions.
    
    If q_no is provided, extract bubbles for that many questions.
    
    Args:
        image: The input image
        q_no: The number of questions to extract bubbles for
    
    Returns:
        A list of bubbles
        bubbles: [ q1 -> [bubble1, bubble2, bubble3, bubble4, bubble5], q2 -> [bubble1, bubble2, bubble3, bubble4, bubble5], ... ]
    """

    area_num = 10
    if q_no:
        area_num = int(q_no // 10 + 1)
    
    contours = get_contours(image)
    candidates = filter_vertical_rectangles(contours)

    # get answer boxs
    areas = get_answer_columns(candidates)

    # save bubbles
    # print(f"Extracting bubbles for first {area_num} areas")
    bubbles = extract_all_bubbles(image, areas[:area_num])

    return bubbles[:q_no]



class BubbleCNN(nn.Module):
    def __init__(self, num_classes=3):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),   # 0
            nn.BatchNorm2d(32),                # 1  ← كانت ناقصة
            nn.ReLU(),                         # 2
            nn.MaxPool2d(2),                   # 3
            nn.Conv2d(32, 64, 3, padding=1),   # 4
            nn.BatchNorm2d(64),                # 5  ← كانت ناقصة
            nn.ReLU(),                         # 6
            nn.MaxPool2d(2),                   # 7
            nn.Conv2d(64, 128, 3, padding=1),  # 8
            nn.BatchNorm2d(128),               # 9  ← كانت ناقصة
            nn.ReLU(),                         # 10
            nn.MaxPool2d(2),                   # 11
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 8 * 8, 256), nn.ReLU(), nn.Dropout(0.5),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        return self.classifier(self.features(x))

    def forward(self, x):
        return self.classifier(self.features(x))


# ── تجهيز الـ transforms ──────────────────────────────
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])
 
# ── تحميل الموديل (مرة واحدة بس) ─────────────────────
model = BubbleCNN(num_classes=3).to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
 
 
# ── الدالة الرئيسية ───────────────────────────────────
def predict_batch(images: list) -> list:
    """
    بتاخد: ليست فيها الصور
    بترجع: ليست فيها الكلاس لكل صورة بنفس الترتيب
 
    مثال:
      input:  [img1, img2, img3]
      output: ["filled", "empty", "ambiguous"]
    """
    results   = ["error"] * len(images)
    valid_idx = []
    tensors   = []

    for i, img in enumerate(images):
        try:
            # لو numpy array (OpenCV) → حوّله لـ PIL
            if isinstance(img, np.ndarray):
                img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
            else:
                img = Image.open(img).convert("L")

            tensors.append(transform(img))
            valid_idx.append(i)

        except Exception as e:
            print(f"⚠️  Skipping bubble_{i}: {e}")

    if not tensors:
        return results

    batch = torch.stack(tensors).to(DEVICE)
    with torch.no_grad():
        preds = model(batch).argmax(dim=1).tolist()

    for idx, pred in zip(valid_idx, preds):
        results[idx] = pred

    return results
 

def detect_answers(image_path: str, num_questions: int = 100) -> list:
    image = cv2.imread(image_path)
    questions = get_questions(image, num_questions)

    results = []

    for question in questions:
        q_result = predict_batch(question)
        results.append(q_result)
    return results
