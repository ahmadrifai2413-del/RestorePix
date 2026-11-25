import cv2


def apply(image, scale=2, method="bicubic"):
    if image.shape[0] * image.shape[1] * scale**2 > 16_000_000:
        raise ValueError("The output exceeds 16 megapixels. Choose a smaller photo or scale.")
    interpolation = cv2.INTER_CUBIC if method == "bicubic" else cv2.INTER_LANCZOS4
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=interpolation)
