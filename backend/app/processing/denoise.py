import cv2


def apply(image, method="median", kernel=3, strength=5):
    if method == "nlm":
        return cv2.fastNlMeansDenoisingColored(image, None, strength, strength, 7, 21)
    return cv2.medianBlur(image, kernel)
