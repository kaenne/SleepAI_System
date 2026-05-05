#!/usr/bin/env python3
"""Generate SleepAI app icons and splash screen using Pillow."""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from pathlib import Path
import math, os, random

# Resolve relative to this script — works for any developer / CI checkout location.
BASE = str(Path(__file__).resolve().parent / "sleep-mobile" / "assets" / "images")

# ── Color palette ─────────────────────────────────────────────────────────────
DARK_TOP   = (20, 8, 55, 255)      # deep violet
DARK_BOT   = (5, 12, 35, 255)      # dark navy
MOON_COLOR = (240, 233, 205)       # warm ivory
GLOW_PUR   = (85, 55, 190)         # purple glow behind moon
GLOW_WARM  = (195, 170, 100)       # golden moon-glow


def vertical_gradient(size: int, c_top: tuple, c_bot: tuple) -> Image.Image:
    img  = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(c_top[0] * (1 - t) + c_bot[0] * t)
        g = int(c_top[1] * (1 - t) + c_bot[1] * t)
        b = int(c_top[2] * (1 - t) + c_bot[2] * t)
        draw.line([(0, y), (size - 1, y)], fill=(r, g, b, 255))
    return img


def add_soft_glow(base: Image.Image, cx, cy, radius, color, alpha=45) -> Image.Image:
    glow  = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d     = ImageDraw.Draw(glow)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              fill=(*color[:3], alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(radius // 3, 1)))
    return Image.alpha_composite(base, glow)


def make_crescent_mask(size, cx, cy, outer_r, bite_ox, bite_oy, bite_r) -> Image.Image:
    outer = Image.new("L", (size, size), 0)
    ImageDraw.Draw(outer).ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=255)
    bite  = Image.new("L", (size, size), 0)
    bx, by = cx + bite_ox, cy + bite_oy
    ImageDraw.Draw(bite).ellipse(
        [bx - bite_r, by - bite_r, bx + bite_r, by + bite_r], fill=255)
    return ImageChops.subtract(outer, bite)


def add_stars(draw: ImageDraw.ImageDraw, size, cx, cy, excl_r, count=30, seed=7):
    random.seed(seed)
    margin  = int(size * 0.05)
    placed  = 0
    attempts = 0
    while placed < count and attempts < 3000:
        x = random.randint(margin, size - margin)
        y = random.randint(margin, size - margin)
        if math.hypot(x - cx, y - cy) > excl_r * 1.15:
            r     = random.choice([1, 1, 1, 2, 2, 3])
            alpha = random.randint(140, 255)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))
            placed += 1
        attempts += 1


def build_base(size: int, transparent_bg=False) -> Image.Image:
    """Moon + stars layer. transparent_bg=True → no background (for adaptive fg)."""
    if transparent_bg:
        base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        base = vertical_gradient(size, DARK_TOP, DARK_BOT)

    cx      = int(size * 0.50)
    cy      = int(size * 0.43)
    outer_r = int(size * 0.265)

    if not transparent_bg:
        base = add_soft_glow(base, cx, cy, int(outer_r * 2.3), GLOW_PUR,  alpha=38)
        base = add_soft_glow(base, cx, cy, int(outer_r * 1.7), GLOW_WARM, alpha=28)

    # Crescent moon
    crescent = make_crescent_mask(
        size, cx, cy,
        outer_r=outer_r,
        bite_ox=int(outer_r * 0.43),
        bite_oy=int(-outer_r * 0.08),
        bite_r =int(outer_r * 0.80),
    )
    moon_layer = Image.new("RGBA", (size, size), (*MOON_COLOR, 255))
    base.paste(moon_layer, mask=crescent)

    # Stars
    add_stars(ImageDraw.Draw(base), size, cx, cy, outer_r)
    return base


# ── Generators ────────────────────────────────────────────────────────────────

def gen_icon_png():
    img = build_base(1024)
    img.convert("RGB").save(os.path.join(BASE, "icon.png"))
    print("✅ icon.png  (1024×1024)")


def gen_splash():
    img = build_base(512)
    img.save(os.path.join(BASE, "splash-icon.png"))
    print("✅ splash-icon.png  (512×512, RGBA)")


def gen_android_adaptive():
    # Foreground: moon+stars on transparent (safe zone ~66% of canvas)
    fg = build_base(1024, transparent_bg=True)
    fg.save(os.path.join(BASE, "android-icon-foreground.png"))
    print("✅ android-icon-foreground.png  (transparent bg)")

    # Background: solid gradient
    bg = vertical_gradient(1024, DARK_TOP, DARK_BOT)
    bg.convert("RGB").save(os.path.join(BASE, "android-icon-background.png"))
    print("✅ android-icon-background.png")

    # Monochrome: white crescent on black (for themed icons Android 13+)
    mono     = Image.new("L", (1024, 1024), 0)
    crescent = make_crescent_mask(
        1024,
        cx=int(1024 * 0.50), cy=int(1024 * 0.43),
        outer_r=int(1024 * 0.265),
        bite_ox=int(1024 * 0.265 * 0.43),
        bite_oy=int(-1024 * 0.265 * 0.08),
        bite_r =int(1024 * 0.265 * 0.80),
    )
    mono.paste(255, mask=crescent)
    # Add stars to monochrome
    random.seed(7)
    d  = ImageDraw.Draw(mono)
    cx, cy, excl = int(1024*0.50), int(1024*0.43), int(1024*0.265)
    margin = 51
    placed = 0
    attempts = 0
    while placed < 30 and attempts < 3000:
        x = random.randint(margin, 1024-margin)
        y = random.randint(margin, 1024-margin)
        if math.hypot(x-cx, y-cy) > excl * 1.15:
            r = random.choice([1, 1, 1, 2, 2, 3])
            d.ellipse([x-r, y-r, x+r, y+r], fill=200)
            placed += 1
        attempts += 1
    mono.save(os.path.join(BASE, "android-icon-monochrome.png"))
    print("✅ android-icon-monochrome.png")


def gen_favicon():
    img = build_base(1024)
    img.resize((64, 64), Image.LANCZOS).convert("RGB").save(
        os.path.join(BASE, "favicon.png"))
    print("✅ favicon.png  (64×64)")


if __name__ == "__main__":
    print("🎨 Generating SleepAI icons...\n")
    gen_icon_png()
    gen_splash()
    gen_android_adaptive()
    gen_favicon()
    print("\n🌙 Done! All icons saved to assets/images/")
