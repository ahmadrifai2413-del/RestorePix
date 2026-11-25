import math
from . import old_photo_restoration, color, denoise, light, repair, restore, sharpen, upscale

TOOLS = {module.__name__.split(".")[-1]: module.apply for module in (color, denoise, light, repair, restore, sharpen, upscale)}
RANGES = {"gamma": (0.7, 3), "clip": (1, 4), "brightness": (-60, 60), "balance": (0, 1),
          "contrast": (0.5, 2), "saturation": (0, 2), "strength": (1, 15), "radius": (1, 7)}
FIELDS = {"restore": ["amount"], "light": ["gamma", "clip", "brightness"], "denoise": ["method","kernel","strength"],
          "color": ["balance","brightness","contrast","saturation"], "sharpen": ["amount"],
          "upscale": ["scale","method"], "repair": ["radius"]}


def process(image, tool, params, mask=None):
    if tool == "oldphoto":
        return old_photo_restoration.apply(image, mask, **params)
    if tool not in TOOLS or set(params) - set(FIELDS[tool]):
        raise ValueError("Unknown tool or unsupported setting.")
    choices = {"method": ("median","nlm") if tool == "denoise" else ("bicubic","lanczos"), "kernel": (3,5,7), "scale": (2,4)}
    for key, value in params.items():
        if key in choices:
            if value not in choices[key] or (key in ("scale","kernel") and type(value) is not int):
                raise ValueError(f"Invalid {key}.")
        else:
            lo, hi = RANGES.get(key, (0, 1 if tool == "restore" else 2))
            if type(value) not in (int,float) or not math.isfinite(value) or not lo <= value <= hi:
                raise ValueError(f"{key} must be between {lo} and {hi}.")
    if tool == "repair":
        if mask is None:
            raise ValueError("A repair mask is required.")
        return repair.apply(image, mask, **params)
    return TOOLS[tool](image, **params)
