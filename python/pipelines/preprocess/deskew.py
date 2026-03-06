import cv2
import numpy as np
import os
from pathlib import Path
import time



def get_contours(image, percent=0.35):
    """
    -convert to binary
    -crop left region
    -find contours in left region

    args:
        image: the image to process
        percent: the percentage of the image to crop
    
    returns:
        contours: the contours of the left region of the image
    """

    # convert to binary
    binaryImage = cv2.adaptiveThreshold(
        image,
        255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        25,
        15
    )

    # crop left region
    h, w = binaryImage.shape[:2]
    crop_w = int(w * percent)
    cropedBinary = binaryImage[:, 0:350]
    
    # find contours in left region
    contours, _ = cv2.findContours(
        cropedBinary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )


    return contours

def filter_vertical_rectangles(image):
    """
    -get contours
    -filter vertical rectangles

    args:
        image: the image to process
    
    returns:
        candidates: the candidates of vertical rectangles
    """
    contours = get_contours(image)
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
    
    return candidates

def compute_angle_from_candidates(image):
    """حساب زاوية الميل من المرشحين"""
    candidates = filter_vertical_rectangles(image)

    if len(candidates) < 10:
        return 0
    
    centers = []
    for (x, y, w, h) in candidates:
        cx = x + w // 2
        cy = y + h // 2
        centers.append((cx, cy))
    
    centers = np.array(centers, dtype=np.float32)
    
    vx, vy, x0, y0 = cv2.fitLine(
        centers,
        cv2.DIST_L2,
        0,
        0.01,
        0.01
    )
    
    angle = np.arctan2(vy[0], vx[0])
    angle_deg = np.degrees(angle)
    
    skew_angle = angle_deg + 90 if angle_deg < 0 else angle_deg - 90
    
    if skew_angle < -45:
        skew_angle += 90
    elif skew_angle > 45:
        skew_angle -= 90
    
    if not np.isfinite(skew_angle):
        return 0
    
    return skew_angle

def rotate_image(angle, image):
    """تدوير الصورة مع الحفاظ على الأبعاد الكاملة"""
    if abs(angle) < 0.1:
        return image
    
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    
    cos = abs(M[0, 0])
    sin = abs(M[0, 1])
    
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]
    
    rotated = cv2.warpAffine(
        image,
        M,
        (new_w, new_h),
        flags=cv2.INTER_LINEAR,
        borderValue=255
    )
    
    return rotated

    
def deskew(image):
    angle = compute_angle_from_candidates(image)
    # angle = compute_angle(image)
    return rotate_image(angle, image)
    

if __name__ == "__main__":
    # معالجة المجلد
    deskew()



# def compute_angle(image):
    
#     left_region = image[:, :550]
    
#     _, binaryImage = cv2.threshold(left_region, 0, 255,
#      cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
#     kernel = np.ones((3,3), np.uint8)
#     binary = cv2.morphologyEx(binaryImage, cv2.MORPH_OPEN, kernel)

#     contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

#     points = []
#     for cnt in contours:
#         area = cv2.contourArea(cnt)
#         if area < 200:
#             continue
        
#         # Get bounding rectangle
#         x, y, w, h = cv2.boundingRect(cnt)
#         cx = x + w // 2
#         cy = y + h // 2
#         points.append((cx, cy))
    
#     if len(points) < 2:
#         return 0
    
#     points = np.array(points, dtype=np.float32)
#     vx, vy, x0, y0 = cv2.fitLine(points,
#                              cv2.DIST_L2,
#                              0, 0.01, 0.01)

#     angle = np.degrees(np.arctan2(vy, vx))
#     skew = angle - 90
    
#     return skew