import cv2
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from models.configs import page_configs

def crop(image):
    # Check if image is already grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image  # Already grayscale

    _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    coords = cv2.findNonZero(binary)

    x, y, w, h = cv2.boundingRect(coords)
    cropped = image[y:y+h, x:x+w]

    return cropped

def crop_orm(image):

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    gray = cv2.GaussianBlur(gray, (5,5), 0)

    _, binary = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return image

    main_contour = max(contours, key=cv2.contourArea)

    x, y, w, h = cv2.boundingRect(main_contour)

    cropped = image[y:y+h, x:x+w]

    return cropped


def crop_smart(image):

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    blur = cv2.GaussianBlur(gray, (5,5), 0)

    _, binary = cv2.threshold(
        blur,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    if contours:

        img_area = image.shape[0] * image.shape[1]

        # فلترة الكونتورز
        valid = []

        for c in contours:
            area = cv2.contourArea(c)

            if area > img_area * 0.4:   # لازم يكون كبير
                valid.append(c)

        if valid:
            main = max(valid, key=cv2.contourArea)

            x,y,w,h = cv2.boundingRect(main)

            return image[y:y+h, x:x+w]

    # fallback للطريقة القديمة
    _, binary = cv2.threshold(gray,240,255,cv2.THRESH_BINARY_INV)
    coords = cv2.findNonZero(binary)

    if coords is not None:
        x,y,w,h = cv2.boundingRect(coords)
        return image[y:y+h, x:x+w]

    return image

def crop_and_resize(image):
    # image = crop(image)
    # image = crop_orm(image)
    image = crop_smart(image)
    image = cv2.resize(image, (page_configs["width"], page_configs["height"]))

    return image

if __name__ == "__main__":
    crop_and_resize()


# def crop_orm(image):
#     if len(image.shape) == 3:
#         gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
#     else:
#         gray = image  # Already grayscale


#     blur = cv2.GaussianBlur(gray, (5,5), 0)

#     edges = cv2.Canny(blur, 50, 150)

#     contours, _ = cv2.findContours(
#         edges,
#         cv2.RETR_EXTERNAL,
#         cv2.CHAIN_APPROX_SIMPLE
#     )

#     largest = max(contours, key=cv2.contourArea)

#     x, y, w, h = cv2.boundingRect(largest)
#     cropped = image[y:y+h, x:x+w]
#     return cropped