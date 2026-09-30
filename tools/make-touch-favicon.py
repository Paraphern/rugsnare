# One-off: apple-touch-icon (180, iOS rounded-corner safe zone, same recipe as
# icon-192/512) and a simplified favicon-32 (thick diamond outline — the full
# logo's inner detail blurs at 16-32 px, the outline mark stays crisp).
from PIL import Image, ImageDraw

BG = "#0b0e14"
CREAM = (246, 238, 220, 255)  # sampled from logo.png border

logo = Image.open(r"C:\GlobalWork\site\logo.png").convert("RGBA")

# --- apple-touch-icon: 180x180, brand bg, logo at 62% (safe zone for iOS rounding) ---
size = 180
canvas = Image.new("RGB", (size, size), BG)
inner = int(size * 0.62)
l = logo.resize((inner, inner), Image.LANCZOS)
canvas.paste(l, ((size - inner) // 2, (size - inner) // 2), l)
canvas.save(r"C:\GlobalWork\site\apple-touch-icon.png", optimize=True)
print("saved apple-touch-icon", canvas.size)

# --- favicon-32: simplified mark, transparent bg (tabs don't mask; dark square would vanish in dark tabs) ---
def diamond_mark(size, stroke_ratio=0.16):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # supersample 8x for clean diagonals, then downscale
    s = size * 8
    big = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    bd = ImageDraw.Draw(big)
    stroke = int(s * stroke_ratio)
    m = stroke  # margin so the stroke isn't clipped at vertices
    bd.polygon([(s // 2, m), (s - m, s // 2), (s // 2, s - m), (m, s // 2)], outline=CREAM, width=stroke)
    return big.resize((size, size), Image.LANCZOS)

for sz in (32, 16):
    diamond_mark(sz).save(rf"C:\GlobalWork\site\favicon-{sz}.png", optimize=True)
    print(f"saved favicon-{sz}")
