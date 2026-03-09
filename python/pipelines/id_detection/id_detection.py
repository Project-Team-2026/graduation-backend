
import cv2
import numpy as np
import glob
import os
import json
import time
import cv2, numpy as np, os, json, re

# ========= SETTINGS =========
REF_PATH  = "D:\\Graduathion project\\graduation-backend\\python\\models\\reference.png"
JSON_OUT  = "ids_results.json"

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
ECC_MICRO_EPS   = 1e-5

ID_EMPTY_THRESHOLD = 0.22
ID_MIN_DIFF = 0.05
K_ERODE, ERODE_ITERS = 3, 1
K_OPEN_STRONG, OPEN_STRONG_ITERS = 7, 2
STRONG_EMPTY_THRESHOLD = 0.06
MIN_STRONG_COLS_FOR_NONEMPTY = 3

MULTI_COUNT_MIN = 2
MULTI_NEAR_BEST_GAP = 0.03
MULTI_SECOND_REL = 0.85


def binarize(gray):
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

def downscale(gray, s):
    return gray if s == 1.0 else cv2.resize(gray, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)

def scale_warp(warp, s):
    w = warp.copy()
    w[0, 2] /= s
    w[1, 2] /= s
    return w

def cell_center_roi(cell, shrink=CENTER_SHRINK):
    h, w = cell.shape
    dh, dw = int(h * shrink / 2), int(w * shrink / 2)
    cy, cx = h // 2, w // 2
    y1, y2 = max(0, cy - dh), min(h, cy + dh)
    x1, x2 = max(0, cx - dw), min(w, cx + dw)
    return cell[y1:y2, x1:x2]

def sanitize_student_id(s, max_trailing_dashes=2):
    if not s:
        return s
    m = re.search(r'-+$', s)
    if not m:
        return s
    trailing = m.group(0)
    if len(trailing) > max_trailing_dashes:
        return s[:-len(trailing)]
    return s

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


def read_student_id_from_crop(crop_bgr):
    th = binarize(cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY))
    h, w = th.shape
    col_w, row_h = w / NUM_COLS, h / NUM_ROWS

    out, strong_cols = [], 0
    first3_strong = [False, False, False]
    warning_any = False

    k_light  = np.ones((K_ERODE, K_ERODE), np.uint8)
    k_strong = np.ones((K_OPEN_STRONG, K_OPEN_STRONG), np.uint8)

    for c in range(NUM_COLS):
        cx1, cx2 = int(round(c * col_w)), int(round((c + 1) * col_w))
        column = th[:, cx1:cx2]

        scores_light, scores_strong = [], []
        for r in range(NUM_ROWS):
            ry1, ry2 = int(round(r * row_h)), int(round((r + 1) * row_h))
            roi = cell_center_roi(column[ry1:ry2, :], CENTER_SHRINK)

            roi_light = cv2.erode(roi, k_light, iterations=ERODE_ITERS)
            scores_light.append(cv2.countNonZero(roi_light) / roi_light.size)

            roi_strong = cv2.erode(roi, k_strong, iterations=OPEN_STRONG_ITERS)
            scores_strong.append(cv2.countNonZero(roi_strong) / roi_strong.size)

        scores_light  = np.asarray(scores_light,  dtype=np.float32)
        scores_strong = np.asarray(scores_strong, dtype=np.float32)

        order = np.argsort(scores_light)[::-1]
        best_r = int(order[0])
        best_score = float(scores_light[best_r])
        second_score = float(scores_light[order[1]]) if len(order) > 1 else 0.0

        strong_best = float(scores_strong.max())
        if c < 3:
            first3_strong[c] = (strong_best >= STRONG_EMPTY_THRESHOLD)

        if strong_best < STRONG_EMPTY_THRESHOLD:
            out.append("-")
            continue

        strong_cols += 1

        near_best_cnt = int(np.sum(scores_light >= (best_score - MULTI_NEAR_BEST_GAP)))
        second_rel_ok = (best_score > 1e-9) and ((second_score / best_score) >= MULTI_SECOND_REL)
        multi_mark = (near_best_cnt >= MULTI_COUNT_MIN) or second_rel_ok

        if multi_mark:
            out.append("-")
            warning_any = True
            continue

        if (best_score < ID_EMPTY_THRESHOLD) or ((best_score - second_score) < ID_MIN_DIFF):
            out.append("-")
            warning_any = True
        else:
            out.append(str(best_r))

    out = out[:EXPECTED_DIGITS]

    if not any(first3_strong):
        return "-" * EXPECTED_DIGITS, True
    if strong_cols < MIN_STRONG_COLS_FOR_NONEMPTY:
        return "-" * EXPECTED_DIGITS, True

    raw_sid = "".join(out)

    sid = sanitize_student_id(raw_sid)

    core_sid = raw_sid.rstrip("-")
    if raw_sid == "-" * EXPECTED_DIGITS:
        warning_any = True
    elif "-" in core_sid:
        warning_any = True

    return sid, warning_any


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
        return {"image": name, "image_path": os.path.abspath(image_path), "student_id": "", "error": "can't read"}

    img = cv2.resize(img, (ref["W"], ref["H"]), interpolation=cv2.INTER_AREA)
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    extra = 120
    sx1, sy1 = max(0, ref["X1"] - extra), max(0, ref["Y1"] - extra)
    sx2, sy2 = min(ref["W"], ref["X2"] + extra), min(ref["H"], ref["Y2"] + extra)

    search_tm = downscale(img_gray[sy1:sy2, sx1:sx2], TM_DOWNSCALE)
    dx0, dy0, score = fast_template_shift(search_tm, ref["ref_tm"], TM_METHOD)
    dx0, dy0 = int(round(dx0 / TM_DOWNSCALE)), int(round(dy0 / TM_DOWNSCALE))

    found_x, found_y = sx1 + dx0, sy1 + dy0
    shift_x, shift_y = (ref["X1"] - found_x), (ref["Y1"] - found_y)

    aligned1 = img
    if score >= TM_MIN_SCORE:
        warp_tm = np.array([[1, 0, shift_x], [0, 1, shift_y]], dtype=np.float32)
        aligned1 = cv2.warpAffine(img, warp_tm, (ref["W"], ref["H"]),
                                  flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    cur_area = cv2.cvtColor(aligned1, cv2.COLOR_BGR2GRAY)[ref["Y1"]:ref["Y2"], ref["X1"]:ref["X2"]]
    cur_micro_f = downscale(cur_area, S_MICRO).astype(np.float32) / 255.0

    warp2, _ = ecc_align_translation(cur_micro_f, ref["ref_micro_f"], ECC_MICRO_ITERS, ECC_MICRO_EPS)
    warp2 = scale_warp(warp2, S_MICRO)

    aligned2 = cv2.warpAffine(aligned1, warp2, (ref["W"], ref["H"]),
                              flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
                              borderMode=cv2.BORDER_REPLICATE)

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


def run_id_detection(image_path):
    ref = init_reference(REF_PATH)

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    r = process_image(image_path, ref)

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=2)

    print(f"{r['image']} | {r['student_id']} | warning={r['warning']}")
    return r