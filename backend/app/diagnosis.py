import cv2
import numpy as np


def analyze(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    residual = gray.astype(np.float32) - cv2.medianBlur(gray, 3)
    brightness, contrast = float(gray.mean()), float(gray.std())
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    noise = float(np.median(np.abs(residual - np.median(residual))) / 0.6745)
    rules = [(brightness < 85, "light"), (contrast < 35, "color"), (sharpness < 75, "sharpen"), (noise > 8, "denoise")]
    return dict(brightness=round(brightness, 2), contrast=round(contrast, 2), sharpness=round(sharpness, 2),
                noise=round(noise, 2), histogram=np.histogram(gray, bins=32, range=(0, 256))[0].tolist(),
                recommendations=[tool for flag, tool in rules if flag])
