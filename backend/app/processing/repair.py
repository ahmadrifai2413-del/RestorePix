import cv2
import numpy as np


def apply(image, mask, radius=3):
    if mask.shape != image.shape[:2] or not np.any(mask):
        raise ValueError("Paint the damaged area before applying repair.")
    binary = np.uint8(mask > 127) * 255
    if not binary.any():
        raise ValueError("The repair mask is empty.")
    repaired = cv2.inpaint(image, binary, radius, cv2.INPAINT_TELEA)
    return np.where(binary[:, :, None] > 0, repaired, image)
