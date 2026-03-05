import os
import cv2
from pathlib import Path
import json


def get_folder_list(folder_path, skip_dirs=None, allowed_ext=None):

    folder_path = Path(folder_path)

    if not folder_path.exists():
        raise FileNotFoundError(f"Folder {folder_path} does not exist")

    if skip_dirs is None:
        skip_dirs = []

    if allowed_ext is not None:
        allowed_ext = {ext.lower() for ext in allowed_ext}

    folder_list = []

    for root, dirs, files in os.walk(folder_path):

        # prevent walking into skipped dirs
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for file in files:
            file_path = Path(root) / file

            if allowed_ext:
                if file_path.suffix.lower() not in allowed_ext:
                    continue

            folder_list.append(Path(file_path))

    folder_list.sort()

    print(f"Number of files in folder({folder_path}): {len(folder_list)}")

    return folder_list


def prepare_dataset(dataset_folder, output_folder):
    dataset_folder = Path(dataset_folder)
    processed_files_path = Path(output_folder)

    
    
    
    # Create processed folder if it doesn't exist
    if not processed_files_path.exists():
        processed_files_path.mkdir(parents=True, exist_ok=True)

    # read all files in dataset folder
    files = get_folder_list(
        dataset_folder,
        skip_dirs=["raw", "processed"],
        allowed_ext=[".pdf", ".jpg", ".png", ".jpeg", ".tiff"]
    )

    # process dataset length
    print(f"\nFound {len(files)} images to process...")

    return files