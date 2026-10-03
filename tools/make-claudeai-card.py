# Builds content/claudeai-card.png (1200x630) for the r/ClaudeAI post.
# Dark terminal aesthetic, red accent from the brand palette.
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

f_head = font("seguisb.ttf", 40)
f_sub = font("segoeui.ttf", 19)
f_num = font("consolab.ttf", 52)
f_label = font("segoeui.ttf", 17)
f_case = font("consola.ttf", 20)
f_out = font("consola.ttf", 21)

x = 56

# Header
d.text((x, 48), "Your Claude agent obeys tool descriptions.", font=f_head, fill=FG)
d.text((x, 96), "Nobody watches them change.", font=f_head, fill=RED)

# Stats row
y = 160
stats = [
    ("66", "version pairs\nall 4 official servers", GREEN),
    ("140", "silent changes\nzero in a changelog", RED),
    ("51%", "of multi-version\nservers drift silently", AMBER),
]
sx = x
for num, label, color in stats:
    d.text((sx, y), num, font=f_num, fill=color)
    d.text((sx, y + 60), label.split('\n')[0], font=f_label, fill=DIM)
    d.text((sx, y + 80), label.split('\n')[1], font=f_label, fill=DIM)
    sx += 370

# Divider
d.line([(x - 10, 275), (W - 50, 275)], fill=(35, 42, 59), width=1)

# Incidents
y = 295
incidents = [
    ("AUG 2026", "Deadbugz: behaves for 3 calls, then hunts SSH keys + AWS creds"),
    ("AUG 2026", "ChainDrop: worm poisons .claude/settings.json - opening project runs it"),
    ("SEP 2026", "Census: 40.6% of MCP servers drift silently after you install them"),
]
for date, desc in incidents:
    d.text((x, y), date, font=f_case, fill=DIM)
    d.text((x + 110, y), desc, font=f_case, fill=FG)
    y += 32

# Terminal catch
box_y = y + 14
d.rectangle([x - 14, box_y, W - 48, box_y + 88], fill=(8, 10, 16), outline=(35, 42, 59), width=1)
d.text((x, box_y + 8), "$ npx rugsnare diff", font=f_out, fill=DIM)
d.text((x, box_y + 34), "  [DRIFT] get_fact_of_the_day (COSMETIC) 28e64e57 -> 877bd5d6", font=f_out, fill=FG)
d.text((x, box_y + 58), "rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 - CI fails", font=f_out, fill=GREEN)

# Footer
d.text((x, box_y + 102), "Pin what you approved. Catch what changes after.", font=f_label, fill=AMBER)
d.text((x, box_y + 124), "github.com/Paraphern/rugsnare", font=f_label, fill=DIM)

img.save(r"C:\GlobalWork\content\claudeai-card.png", optimize=True)

# Fit check
for label, text, f in [
    ("head1", "Your Claude agent obeys tool descriptions.", f_head),
    ("head2", "Nobody watches them change.", f_head),
    ("case3", "Census: 40.6% of MCP servers drift silently after you install them", font("consola.ttf", 20)),
    ("verdict", "rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 - CI fails", f_out),
]:
    print(f"{label}: ends at {x + d.textlength(text, font=f):.0f}px (limit {W - 48})")
print("bottom:", box_y + 124 + 24, "of", H - 24)
