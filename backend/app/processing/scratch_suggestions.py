"""Conservative suggestions only. User reviews/erases the mask before repair."""
import cv2
import numpy as np


def suggest(image):
    height, width = image.shape[:2]
    scale = min(1, 1800 / max(height, width))
    view = cv2.resize(image, (max(1, round(width * scale)), max(1, round(height * scale))), interpolation=cv2.INTER_AREA) if scale < 1 else image
    gray = cv2.cvtColor(view, cv2.COLOR_BGR2GRAY)
    # Bright thin marks are safer candidates than dark marks (eyes, brows, print text).
    background = cv2.medianBlur(gray, 7)
    residue = cv2.subtract(gray, background)
    candidate = np.uint8((residue > 34) & (gray > 165)) * 255
    _, labels, stats, _ = cv2.connectedComponentsWithStats(candidate)
    w, h, area = stats[:, 2], stats[:, 3], stats[:, 4]
    longest, shortest = np.maximum(w, h), np.minimum(w, h)
    slender = longest / np.maximum(1, shortest)
    small_mark = (area >= 2) & (area <= 220) & (longest <= 140) & ((area <= 28) | (slender >= 3))
    thin_scratch = ((slender >= 12) & (shortest <= 5) & (area <= gray.size * .015)
                    & (longest <= max(gray.shape) * .85))
    keep = small_mark | thin_scratch
    keep[0] = False
    # Index once per pixel, rather than scanning the whole image for every component.
    accepted = np.uint8(keep[labels]) * 255
    # Recover narrow straight scratches even when they touch a larger bright object.
    # Suggestions remain editable: white borders/highlights can also match this rule.
    for kernel in [np.ones((max(17, gray.shape[0] // 20), 1), np.uint8),
                   np.ones((1, max(17, gray.shape[1] // 20)), np.uint8)]:
        lines = cv2.morphologyEx(candidate, cv2.MORPH_OPEN, kernel)
        _, parts, boxes, _ = cv2.connectedComponentsWithStats(lines)
        w, h, area = boxes[:, 2], boxes[:, 3], boxes[:, 4]
        line_keep = ((np.minimum(w, h) <= 5) & (np.maximum(w, h) / np.maximum(1, np.minimum(w, h)) >= 12)
                     & (area <= gray.size * .015))
        line_keep[0] = False
        accepted[line_keep[parts]] = 255
    accepted = cv2.dilate(accepted, np.ones((3, 3), np.uint8), iterations=1)
    if scale < 1:
        accepted = cv2.resize(accepted, (width, height), interpolation=cv2.INTER_NEAREST)
    coverage = np.count_nonzero(accepted) / accepted.size
    # Never suggest broad texture removal on intricate images.
    if coverage > 0.08:
        accepted[:] = 0
    return accepted
