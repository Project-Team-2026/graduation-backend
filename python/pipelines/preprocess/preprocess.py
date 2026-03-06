import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from pipelines.preprocess.deskew import deskew
from pipelines.preprocess.crop import crop_and_resize
from pipelines.preprocess.cleanup import clean_omr
import cv2
from pathlib import Path

def preprocess(image_path):
    """
    Preprocess an image by applying deskewing, cropping, and enhancement.
    
    Args:
        image_path (str): Path to the input image file.
        
    Returns:
        dict: A dictionary containing the preprocessing result with keys:
            - success (bool): Whether the preprocessing was successful.
            - message (str): A message describing the result.
    """

    result = {}
    image_path = Path(image_path)

    # read image
    if not image_path.exists():
        result['success'] = False
        result['message'] = f"Image not found: {image_path}"
        return result
    
    image = cv2.imread(image_path)

    # preprocess
    # step 1: enhance bubble sheet
    image = clean_omr(image)
    # step 2: deskew
    image = deskew(image)
    # step 3: crop and resize
    image = crop_and_resize(image)

    # override the original image with the preprocessed image
    cv2.imwrite(image_path, image)


    result['success'] = True

    return result

    if __name__ == "__main__":
        preprocess()