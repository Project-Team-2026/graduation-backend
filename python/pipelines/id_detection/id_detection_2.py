import cv2
import numpy as np
import os
import json
import re
import glob
# import REF_PATH from 

# ========= SETTINGS =========
REF_PATH = "D:\\Graduathion_project\\graduation-backend\\python\\models\\reference.png"
JSON_OUT = "ids_results.json"

X_START_RATIO, X_END_RATIO = 0.365, 0.56
Y_START_RATIO, Y_END_RATIO = 0.10, 0.275

OUT_W, OUT_H = 420, 620
NUM_COLS, NUM_ROWS = 9, 10
EXPECTED_DIGITS = 8
CENTER_SHRINK = 0.55
PAD = 40

TM_DOWNSCALE = 0.5
TM_METHOD = cv2.TM_CCOEFF_NORMED
TM_MIN_SCORE = 0.35
S_MICRO = 0.75
ECC_MICRO_ITERS = 120
ECC_MICRO_EPS = 1e-5

ID_EMPTY_THRESHOLD = 0.22
ID_MIN_DIFF = 0.05
K_ERODE, ERODE_ITERS = 3, 1
K_OPEN_STRONG, OPEN_STRONG_ITERS = 7, 2
STRONG_EMPTY_THRESHOLD = 0.06
MIN_STRONG_COLS_FOR_NONEMPTY = 3

MULTI_COUNT_MIN = 2
MULTI_NEAR_BEST_GAP = 0.03
MULTI_SECOND_REL = 0.85

RESCUE_CENTER_SHRINK = 0.42
RESCUE_OPEN_KERNEL = 5
RESCUE_OPEN_ITERS = 1
RESCUE_MIN_SCORE = 0.05
RESCUE_MIN_DIFF = 0.018

IMG_EXTS = ("*.png", "*.jpg", "*.jpeg", "*.bmp", "*.tif", "*.tiff")


def binarize(gray):
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]


def downscale(img, s):
    return img if s == 1.0 else cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)


def scale_warp(warp, s):
    warp = warp.copy()
    warp[0, 2] /= s
    warp[1, 2] /= s
    return warp


def cell_center_roi(cell, shrink):
    h, w = cell.shape
    dh, dw = int(h * shrink / 2), int(w * shrink / 2)
    cy, cx = h // 2, w // 2
    return cell[max(0, cy - dh):min(h, cy + dh), max(0, cx - dw):min(w, cx + dw)]


def sanitize_student_id(s, max_trailing_dashes=2):
    m = re.search(r'-+$', s or "")
    return s[:-len(m.group(0))] if m and len(m.group(0)) > max_trailing_dashes else s


def fast_template_shift(search_gray, templ_gray, method=TM_METHOD):
    res = cv2.matchTemplate(search_gray, templ_gray, method)
    mn, mx, mn_loc, mx_loc = cv2.minMaxLoc(res)
    if method in (cv2.TM_SQDIFF, cv2.TM_SQDIFF_NORMED):
        return mn_loc[0], mn_loc[1], 1.0 - float(mn)
    return mx_loc[0], mx_loc[1], float(mx)


def ecc_align_translation(img_f, ref_f, iters, eps):
    warp = np.eye(2, 3, dtype=np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, iters, eps)
    try:
        cv2.findTransformECC(ref_f, img_f, warp, cv2.MOTION_TRANSLATION, crit, None, 1)
        return warp, True
    except cv2.error:
        return warp, False


def rescue_ambiguous_digit(column_bin, row_h):
    k = np.ones((RESCUE_OPEN_KERNEL, RESCUE_OPEN_KERNEL), np.uint8)
    scores = []

    for r in range(NUM_ROWS):
        y1, y2 = int(round(r * row_h)), int(round((r + 1) * row_h))
        roi = cell_center_roi(column_bin[y1:y2, :], RESCUE_CENTER_SHRINK)
        opened = cv2.morphologyEx(roi, cv2.MORPH_OPEN, k, iterations=RESCUE_OPEN_ITERS)
        scores.append(cv2.countNonZero(opened) / opened.size)

    scores = np.asarray(scores, dtype=np.float32)
    order = np.argsort(scores)[::-1]
    best_r = int(order[0])
    best_score = float(scores[best_r])
    second_score = float(scores[order[1]]) if len(order) > 1 else 0.0

    if best_score >= RESCUE_MIN_SCORE and (best_score - second_score) >= RESCUE_MIN_DIFF:
        return str(best_r), True
    return "-", False


def finalize_warning_from_sid(sid):
    return bool(sid and sid != "-" * EXPECTED_DIGITS and "-" in sid)


def read_student_id_from_crop(crop_bgr):
    th = binarize(cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY))
    h, w = th.shape
    col_w, row_h = w / NUM_COLS, h / NUM_ROWS

    out = []
    strong_cols = 0
    first3_strong = [False] * 3

    k_light = np.ones((K_ERODE, K_ERODE), np.uint8)
    k_strong = np.ones((K_OPEN_STRONG, K_OPEN_STRONG), np.uint8)

    for c in range(NUM_COLS):
        x1, x2 = int(round(c * col_w)), int(round((c + 1) * col_w))
        column = th[:, x1:x2]

        scores_light, scores_strong = [], []

        for r in range(NUM_ROWS):
            y1, y2 = int(round(r * row_h)), int(round((r + 1) * row_h))
            roi = cell_center_roi(column[y1:y2, :], CENTER_SHRINK)

            roi_light = cv2.erode(roi, k_light, iterations=ERODE_ITERS)
            roi_strong = cv2.morphologyEx(roi, cv2.MORPH_OPEN, k_strong, iterations=OPEN_STRONG_ITERS)

            scores_light.append(cv2.countNonZero(roi_light) / roi_light.size)
            scores_strong.append(cv2.countNonZero(roi_strong) / roi_strong.size)

        scores_light = np.asarray(scores_light, dtype=np.float32)
        scores_strong = np.asarray(scores_strong, dtype=np.float32)

        order = np.argsort(scores_light)[::-1]
        best_r = int(order[0])
        best_score = float(scores_light[best_r])
        second_score = float(scores_light[order[1]]) if len(order) > 1 else 0.0
        strong_best = float(scores_strong.max())

        if c < 3:
            first3_strong[c] = strong_best >= STRONG_EMPTY_THRESHOLD

        if strong_best < STRONG_EMPTY_THRESHOLD:
            out.append("-")
            continue

        strong_cols += 1

        near_best_cnt = int(np.sum(scores_light >= (best_score - MULTI_NEAR_BEST_GAP)))
        second_rel_ok = best_score > 1e-9 and (second_score / best_score) >= MULTI_SECOND_REL
        multi_mark = near_best_cnt >= MULTI_COUNT_MIN or second_rel_ok

        if not multi_mark and best_score >= ID_EMPTY_THRESHOLD and (best_score - second_score) >= ID_MIN_DIFF:
            out.append(str(best_r))
            continue

        rescued_digit, rescued = rescue_ambiguous_digit(column, row_h)
        out.append(rescued_digit if rescued and rescued_digit != "-" else "-")

    out = out[:EXPECTED_DIGITS]

    if not any(first3_strong) or strong_cols < MIN_STRONG_COLS_FOR_NONEMPTY:
        sid = "-" * EXPECTED_DIGITS
        return sid, finalize_warning_from_sid(sid)

    sid = sanitize_student_id("".join(out))
    return sid, finalize_warning_from_sid(sid)


def init_reference(ref_path=REF_PATH):
    ref = cv2.imread(ref_path)
    if ref is None:
        raise FileNotFoundError(f"Reference image not found: {ref_path}")

    ref_gray = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
    H, W = ref_gray.shape[:2]

    x1, x2 = int(W * X_START_RATIO), int(W * X_END_RATIO)
    y1, y2 = int(H * Y_START_RATIO), int(H * Y_END_RATIO)

    X1, Y1 = max(0, x1 - PAD), max(0, y1 - PAD)
    X2, Y2 = min(W, x2 + PAD), min(H, y2 + PAD)

    ref_id_area = ref_gray[Y1:Y2, X1:X2]

    return {
        "W": W, "H": H,
        "x1": x1, "x2": x2, "y1": y1, "y2": y2,
        "X1": X1, "X2": X2, "Y1": Y1, "Y2": Y2,
        "ref_tm": downscale(ref_id_area, TM_DOWNSCALE),
        "ref_micro_f": downscale(ref_id_area, S_MICRO).astype(np.float32) / 255.0
    }


def process_image(image_path, ref):
    name = os.path.basename(image_path)
    img = cv2.imread(image_path)

    if img is None:
        return {
            "image": name,
            "image_path": os.path.abspath(image_path),
            "student_id": "",
            "warning": False,
            "error": "can't read"
        }

    img = cv2.resize(img, (ref["W"], ref["H"]), interpolation=cv2.INTER_AREA)
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    extra = 120
    sx1, sy1 = max(0, ref["X1"] - extra), max(0, ref["Y1"] - extra)
    sx2, sy2 = min(ref["W"], ref["X2"] + extra), min(ref["H"], ref["Y2"] + extra)

    search_tm = downscale(img_gray[sy1:sy2, sx1:sx2], TM_DOWNSCALE)
    dx0, dy0, score = fast_template_shift(search_tm, ref["ref_tm"])
    dx0, dy0 = int(round(dx0 / TM_DOWNSCALE)), int(round(dy0 / TM_DOWNSCALE))

    found_x, found_y = sx1 + dx0, sy1 + dy0
    shift_x, shift_y = ref["X1"] - found_x, ref["Y1"] - found_y

    aligned1 = img
    if score >= TM_MIN_SCORE:
        warp_tm = np.array([[1, 0, shift_x], [0, 1, shift_y]], dtype=np.float32)
        aligned1 = cv2.warpAffine(
            img, warp_tm, (ref["W"], ref["H"]),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE
        )

    cur_area = cv2.cvtColor(aligned1, cv2.COLOR_BGR2GRAY)[ref["Y1"]:ref["Y2"], ref["X1"]:ref["X2"]]
    cur_micro_f = downscale(cur_area, S_MICRO).astype(np.float32) / 255.0

    warp2, _ = ecc_align_translation(cur_micro_f, ref["ref_micro_f"], ECC_MICRO_ITERS, ECC_MICRO_EPS)
    warp2 = scale_warp(warp2, S_MICRO)

    aligned2 = cv2.warpAffine(
        aligned1, warp2, (ref["W"], ref["H"]),
        flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
        borderMode=cv2.BORDER_REPLICATE
    )

    id_box = aligned2[ref["y1"]:ref["y2"], ref["x1"]:ref["x2"]]
    sid, warning = ("", False)

    if id_box.size:
        sid, warning = read_student_id_from_crop(
            cv2.resize(id_box, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)
        )

    return {
        "image": name,
        "image_path": os.path.abspath(image_path),
        "student_id": sid,
        "warning": warning
    }


def get_images_from_input(input_path):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Path not found: {input_path}")

    if os.path.isfile(input_path):
        return [input_path]

    if os.path.isdir(input_path):
        images = []
        for ext in IMG_EXTS:
            images += glob.glob(os.path.join(input_path, ext))
            images += glob.glob(os.path.join(input_path, ext.upper()))
        return sorted(set(images))

    raise ValueError(f"Unsupported path: {input_path}")


def run_id_detection(image_path):
    ref = init_reference(REF_PATH)

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    r = process_image(image_path, ref)


    return r