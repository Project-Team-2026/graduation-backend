import cv2
import os
import sys
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import multiprocessing
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
# from pipelines.utils import get_folder_list


# def enhance_bubble_sheet(image):

#     # Convert to LAB color space
#     lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
#     l, a, b = cv2.split(lab)

#     # Apply CLAHE for better contrast
#     clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
#     l2 = clahe.apply(l)

#     # Merge channels back
#     lab = cv2.merge((l2, a, b))
#     enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

#     # Fast denoising (Gaussian is faster than bilateral)
#     denoised = cv2.GaussianBlur(enhanced, (5, 5), 0)

#     # Convert to grayscale
#     gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)

#     # Illumination correction
#     background = cv2.GaussianBlur(gray, (45, 45), 0)
#     illumination_corrected = cv2.divide(gray, background, scale=255)

#     # Sharpen
#     blur = cv2.GaussianBlur(illumination_corrected, (0, 0), 1.2)
#     sharpen = cv2.addWeighted(illumination_corrected, 1.6, blur, -0.6, 0)

#     return sharpen  # Keep as grayscale (faster + smaller)




def clean_omr(image):

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Light denoise
    blur = cv2.GaussianBlur(gray, (3,3), 0)

    return blur







if __name__ == "__main__":
    clean_omr()
    # enhance_bubble_sheet()
