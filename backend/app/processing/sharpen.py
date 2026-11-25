import cv2


def apply(image, amount=0.65):
    blurred = cv2.GaussianBlur(image, (0, 0), 1.2)
    return cv2.addWeighted(image, 1 + amount, blurred, -amount, 0)
