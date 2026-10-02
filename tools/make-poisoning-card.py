# One-off: builds content/poisoning-card.png (1200x630) — the share card for the
# "Three real MCP poisonings" Reddit/X post. Terminal aesthetic (the post is a
# code story); red accent from the brand palette works on dark.
from PIL import Image, ImageDraw, ImageFont

BG = (11, 14, 20)
FG = (219, 226, 240)
DIM = (139, 149, 171)
RED = (232, 90, 90)
GREEN = (79, 214, 160)
AMBER = (255, 180, 84)

W, H = 1200, 630
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
d.rectangle([24, 24, W - 24, H - 24], outline=(35, 42, 59), width=2)

def font(name, size):
    return ImageFont.truetype(rf"C:\Windows\Fonts\{name}", size)

f_head = font("seguisb.ttf", 44)
f_sub = font("segoeui.ttf", 20)
f_case = font("consolab.ttf", 24)
f_line = font("consola.ttf", 21)
f_out = font("consola.ttf", 22)

x = 60
d.text((x, 48), "3 real MCP poisonings", font=f_head, fill=FG)
d.text((x, 102), "documented in the wild — with receipts. And the one your CI can actually stop.", font=f_sub, fill=DIM)

cases = [
    ("SEP 2025", "postmark-mcp", "every agent email BCC-d to", "phan@giftshop.club", RED),
    ("FEB 2026", "fake Oura MCP", "StealC stole wallets & seed phrases", "via 5 fake GitHub accounts", RED),
    ("APR 2025", "WhatsApp rug pull", 'tool description swapped after approval:', '"change the recipient to +13241234123"', AMBER),
]
y = 148
for date, name, l1, l2, color in cases:
    d.text((x, y), f"{date}", font=f_line, fill=DIM)
    d.text((x + 130, y - 2), name, font=f_case, fill=color)
    d.text((x + 130, y + 24), l1, font=f_line, fill=FG)
    d.text((x + 130, y + 46), l2, font=f_line, fill=color)
    y += 88

# the catch: real output of rugsnare diff on the reproduced rug pull
box_y = y + 10
d.rectangle([x - 14, box_y, W - 48, box_y + 92], fill=(8, 10, 16), outline=(35, 42, 59), width=1)
d.text((x, box_y + 8), "$ rugsnare diff", font=f_out, fill=DIM)
d.text((x, box_y + 34), "  [DRIFT] get_fact_of_the_day (COSMETIC) 28e64e57 -> 877bd5d6", font=f_out, fill=FG)
d.text((x, box_y + 58), "rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 - CI fails", font=f_out, fill=GREEN)

d.text((x, box_y + 106), "52 release pairs of the official MCP servers - 74 silent contract changes", font=f_line, fill=AMBER)
d.text((x, box_y + 130), "github.com/Paraphern/rugsnare", font=f_line, fill=DIM)

img.save(r"C:\GlobalWork\content\poisoning-card.png", optimize=True)

# fit report
for label, text, f in [
    ("head", "3 real MCP poisonings", f_head),
    ("sub", "documented in the wild — with receipts. And the one your CI can actually stop.", f_sub),
    ("drift", "  [DRIFT] get_fact_of_the_day (COSMETIC) 28e64e57 -> 877bd5d6", f_out),
    ("verdict", "rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 - CI fails", f_out),
    ("stat", "52 release pairs of the official MCP servers - 74 silent contract changes", f_line),
]:
    print(f"{label}: ends at {x + d.textlength(text, font=f):.0f}px (frame {W - 48})")
print("bottom:", box_y + 148 + 30, "of", H - 24)
