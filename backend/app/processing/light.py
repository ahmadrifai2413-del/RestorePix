import cv2
import numpy as np


def luminance_clahe(image, clip):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def apply(image, gamma=1.6, clip=1.8, brightness=0):
    table = np.uint8(np.clip(255 * (np.arange(256) / 255) ** (1 / gamma) + brightness, 0, 255))
    return luminance_clahe(cv2.LUT(image, table), clip)
