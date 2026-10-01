# One-off: regenerate site/assets/social-preview.png (1200x630) in the
# Direction A "Precision" brand: paper bg, ink text, deep-red accent.
# Mirrors the new hero copy. Fonts: Segoe UI (visual stand-in for Geist,
# which ships as woff2 only and PIL cannot load).
from PIL import Image, ImageDraw, ImageFont

PAPER = "#FAF7F0"
INK = "#1A1611"
INK2 = "#57503F"
LINE = "#E4DDCC"
ACCENT = "#8B1D28"
OK = "#1E6B4A"

W, H = 1200, 630

img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

# hairline frame, inset — the "precision" feel of the new design
d.rectangle([24, 24, W - 24, H - 24], outline=LINE, width=2)

# logo left
logo = Image.open(r"C:\GlobalWork\site\assets\logo-256.png").convert("RGBA")
logo = logo.resize((240, 240), Image.LANCZOS)
img.paste(logo, (100, (H - 240) // 2), logo)

def font(name, size):
    return ImageFont.truetype(rf"C:\Windows\Fonts\{name}", size)

f_over = font("segoeuib.ttf", 22)      # overline: bold caps
f_title = font("seguisb.ttf", 118)     # title
f_tag = font("segoeui.ttf", 36)        # tagline = new hero line
f_pill = font("consolab.ttf", 25)      # pills, mono like the site

x = 420

# overline with manual letterspacing
overline = "RUNTIME INTEGRITY FOR AI AGENTS"
spaced = " ".join(overline)
d.text((x + 2, 138), spaced, font=f_over, fill=ACCENT)

d.text((x, 182), "RugSnare", font=f_title, fill=INK)

# tagline: the new hero headline, wrapped to two lines
d.text((x, 330), "The tool you approved", font=f_tag, fill=INK2)
d.text((x, 378), "is not the tool running today.", font=f_tag, fill=INK2)

# pills row
py = 470
sep = "  ·  "
f_pill = font("consolab.ttf", 22)
w_all = d.textlength("0 dependencies" + sep + "open source" + sep + "on-chain verified", font=f_pill)
d.text((x, py), "0 dependencies", font=f_pill, fill=OK)
w1 = d.textlength("0 dependencies", font=f_pill)
d.text((x + w1, py), sep, font=f_pill, fill=INK2)
w2 = d.textlength(sep, font=f_pill)
d.text((x + w1 + w2, py), "open source", font=f_pill, fill=OK)
w3 = d.textlength("open source", font=f_pill)
d.text((x + w1 + w2 + w3, py), sep, font=f_pill, fill=INK2)
w4 = d.textlength(sep, font=f_pill)
d.text((x + w1 + w2 + w3 + w4, py), "on-chain verified", font=f_pill, fill=OK)

img.save(r"C:\GlobalWork\site\assets\social-preview.png", optimize=True)

# fit report
print("title end:", x + d.textlength("RugSnare", font=f_title))
print("overline end:", x + 2 + d.textlength(spaced, font=f_over))
print("tagline2 end:", x + d.textlength("is not the tool running today.", font=f_tag))
print("pills end:", x + w_all)
print("saved", img.size)
