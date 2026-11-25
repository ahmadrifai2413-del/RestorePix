import cv2
from . import sharpen, light


def apply(image, amount=0.6):
    filtered = cv2.medianBlur(image, 3)
    lifted = light.apply(filtered, gamma=1.15, clip=1.6)
    return cv2.addWeighted(image, 1 - amount, sharpen.apply(lifted, 0.35), amount, 0)
