import cv2
import numpy as np


def apply(image, balance=0.5, brightness=0, contrast=1, saturation=1):
    means = image.mean(axis=(0, 1))
    gains = np.clip(means.mean() / np.maximum(means, 1), 0.6, 1.6)
    adjusted = image.astype(np.float32) * (1 + balance * (gains - 1))
    adjusted = np.uint8(np.clip((adjusted - 128) * contrast + 128 + brightness, 0, 255))
    hsv = cv2.cvtColor(adjusted, cv2.COLOR_BGR2HSV)
    hsv[:, :, 1] = np.uint8(np.clip(hsv[:, :, 1].astype(float) * saturation, 0, 255))
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
