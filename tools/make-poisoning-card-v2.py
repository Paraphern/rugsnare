# Builds content/poisoning-card.png (1200x630) - updated numbers for r/mcp post.
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
f_sub = font("segoeui.ttf", 19)
f_num = font("consolab.ttf", 52)
f_label = font("segoeui.ttf", 16)
f_case = font("consolab.ttf", 22)
f_line = font("consola.ttf", 20)
f_out = font("consola.ttf", 21)

x = 56

# Header
d.text((x, 46), "We diffed all 66 release pairs", font=f_head, fill=FG)
d.text((x, 96), "of the official MCP servers.", font=f_head, fill=FG)

# Stats row
y = 162
stats = [
    ("140", "silent changes", RED),
    ("0", "in a changelog", GREEN),
    ("51%", "of servers drift", AMBER),
]
sx = x
for num, label, color in stats:
    d.text((sx, y), num, font=f_num, fill=color)
    d.text((sx, y + 58), label, font=f_label, fill=DIM)
    sx += 370

# Divider
d.line([(x - 10, 250), (W - 50, 250)], fill=(35, 42, 59), width=1)

# Split
y = 268
d.text((x, y), "43 BREAKING  ·  28 hint flips  ·  7 cosmetic  ·  37 new items  ·  24 removed", font=f_line, fill=DIM)

# Incidents
y = 302
incidents = [
    ("SEP 2025", "postmark-mcp: every agent email BCC-d to an attacker"),
    ("FEB 2026", "Fake Oura MCP: StealC stole wallets + seed phrases"),
    ("AUG 2026", "Deadbugz: behaves for 3 calls, then hunts SSH keys"),
]
for date, desc in incidents:
    d.text((x, y), date, font=f_line, fill=DIM)
    d.text((x + 110, y), desc, font=f_line, fill=FG)
    y += 30

# Terminal catch
box_y = y + 14
d.rectangle([x - 14, box_y, W - 48, box_y + 88], fill=(8, 10, 16), outline=(35, 42, 59), width=1)
d.text((x, box_y + 8), "$ npx rugsnare diff", font=f_out, fill=DIM)
d.text((x, box_y + 34), "  [DRIFT] get_fact_of_the_day (COSMETIC) 28e64e57 -> 877bd5d6", font=f_out, fill=FG)
d.text((x, box_y + 58), "rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 - CI fails", font=f_out, fill=GREEN)

# Footer
d.text((x, box_y + 102), "Pin what you approved. Catch what changes after.", font=f_label, fill=AMBER)
d.text((x, box_y + 122), "github.com/Paraphern/rugsnare", font=f_label, fill=DIM)

img.save(r"C:\GlobalWork\content\poisoning-card.png", optimize=True)

# Fit check
checks = [
    ("head1", "We diffed all 66 release pairs", f_head),
    ("split", "43 BREAKING  ·  28 hint flips  ·  7 cosmetic  ·  37 new items  ·  24 removed", f_line),
    ("case3", "Deadbugz: behaves for 3 calls, then hunts SSH keys", f_line),
    ("verdict", "rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 - CI fails", f_out),
]
for label, text, f in checks:
    print(f"{label}: ends at {x + d.textlength(text, font=f):.0f}px (limit {W - 48})")
print("bottom:", box_y + 122 + 24, "of", H - 24)
