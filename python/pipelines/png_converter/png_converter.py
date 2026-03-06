from pathlib import Path
from PIL import Image
import fitz  # PyMuPDF
import os
from concurrent.futures import ProcessPoolExecutor
import fitz
import numpy as np
import cv2
from models.configs import dpi

def pdf_to_images(file_path, dpi=dpi):
    file_path = Path(file_path)
    folder_path = file_path.parent
    images_paths = []

    with fitz.open(file_path) as doc:
        for page in doc:
            # read img from PDF page as pixmap
            pix = page.get_pixmap(dpi=dpi)

            # Convert Pixmap to numpy array
            img = np.frombuffer(pix.samples, dtype=np.uint8)
            img = img.reshape(pix.height, pix.width, pix.n)

            # لو الصورة فيها alpha channel نشيله
            if pix.n == 4:
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

            # save image
            image_path = folder_path / f"{file_path.stem}_page_{page.number}.png"
            cv2.imwrite(str(image_path), img)
            images_paths.append(str(image_path))

    # delete pdf file
    os.remove(file_path)

    return images_paths




def pdf_image_converter(file_path):
    """
    convert pdf to images and return list of images

    Args:
        file_path: path to (pdf or image) file
    Returns:
        list of images
    """
    file_path = Path(file_path)
    ext = file_path.suffix.lower()

    supported_images = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']

    if not file_path.exists():
        return {"success": False, "message": f"File {file_path} does not exist"}
    
    # If image
    if ext in supported_images:
        # read image
        img = cv2.imread(str(file_path))

        if img is None:
            return {"success": False, "message": f"Failed to read image: {file_path}"}


        return {"success": True, "pages": 1, "data": [file_path]}

    # 1) PDF Conversion
    elif ext == ".pdf":
        result = pdf_to_images(str(file_path))
        return {"success": True, "pages": len(result), "data": result}

    else:
        return {"success": False, "message": f"Unsupported file format: {ext}"}

if __name__ == "__main__":
    pdf_image_converter()