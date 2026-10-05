# Builds content/villains-card.png (1200x630) — dramatic before/after diff.
from PIL import Image, ImageDraw, ImageFont

BG = (8, 10, 15)
TERMINAL_BG = (15, 18, 25)
FG = (220, 225, 235)
DIM = (100, 110, 130)
RED = (240, 80, 80)
GREEN = (80, 220, 140)
AMBER = (255, 190, 60)
WHITE = (255, 255, 255)
DARK_GREEN = (20, 60, 35)
DARK_RED = (60, 20, 20)

W, H = 1200, 630
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

def font(name, size):
    return ImageFont.truetype(rf"C:\Windows\Fonts\{name}", size)

f_big = font("seguisb.ttf", 36)
f_head = font("seguisb.ttf", 28)
f_term = font("consola.ttf", 17)
f_term_b = font("consolab.ttf", 17)
f_num = font("consolab.ttf", 80)
f_label = font("segoeui.ttf", 15)
f_smal = font("segoeui.ttf", 13)
f_mono_s = font("consola.ttf", 14)

# === LEFT SIDE: The scary thesis ===
x = 50

d.text((x, 35), "MCP tool descriptions", font=f_big, fill=FG)
d.text((x, 75), "are the ONLY thing", font=f_big, fill=RED)
d.text((x, 115), "between your agent", font=f_big, fill=FG)
d.text((x, 155), "and rm -rf", font=f_big, fill=RED)

# Divider
d.line([(x, 200), (x, 200)], fill=DIM)

# Stats
y_stats = 205
d.text((x, y_stats), "186 packages scanned", font=f_label, fill=DIM)
d.text((x, y_stats + 22), "12 caught changing contracts", font=f_label, fill=AMBER)
d.text((x, y_stats + 44), "after you approved them", font=f_label, fill=AMBER)

# === RIGHT SIDE: Terminal diff ===
tx, ty = 500, 30
tw, th = 650, 420

# Terminal window
d.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=10, fill=TERMINAL_BG, outline=(40, 45, 60), width=2)

# Terminal title bar
d.rounded_rectangle([tx, ty, tx + tw, ty + 32], radius=10, fill=(25, 28, 38))
d.rectangle([tx, ty + 20, tx + tw, ty + 32], fill=(25, 28, 38))
d.ellipse([tx + 12, ty + 10, tx + 24, ty + 22], fill=(255, 95, 86))
d.ellipse([tx + 30, ty + 10, tx + 42, ty + 22], fill=(255, 189, 46))
d.ellipse([tx + 48, ty + 10, tx + 60, ty + 22], fill=(39, 201, 63))
d.text((tx + 75, ty + 7), "rugsnare diff -- v2.0.2 → v2.0.3", font=f_mono_s, fill=DIM)

# Diff content
dy = ty + 45
dx = tx + 16

# Version line
d.text((dx, dy), "# @jadchene/mcp-ssh-service  (206 installs/week)", font=f_mono_s, fill=DIM)
dy += 24

# BEFORE section
d.text((dx, dy), "── v2.0.2 (approved) " + "─" * 30, font=f_mono_s, fill=DIM)
dy += 20

# Green background for "before" lines
for i, (tool, desc) in enumerate([
    ("rm_safe", "Delete a path... Requires confirmation."),
    ("kill_process", "Kill a process. Requires confirmation."),
    ("execute_command", "Run shell command. Requires confirmation."),
]):
    bg_y = dy + i * 24
    d.rectangle([dx - 6, bg_y, tx + tw - 10, bg_y + 22], fill=DARK_GREEN)
    d.text((dx, bg_y), f"  {tool}:", font=f_term, fill=GREEN)
    d.text((dx + 150, bg_y), f'"{desc}"', font=f_term, fill=GREEN)

dy += 3 * 24 + 12

# AFTER section
d.text((dx, dy), "── v2.0.3 (patch update) " + "─" * 26, font=f_mono_s, fill=RED)
dy += 20

# Red background for "after" lines
for i, (tool, desc) in enumerate([
    ("rm_safe", "Delete a remote file."),
    ("kill_process", "Kill a process."),
    ("execute_command", "Run a shell command."),
]):
    bg_y = dy + i * 24
    d.rectangle([dx - 6, bg_y, tx + tw - 10, bg_y + 22], fill=DARK_RED)
    d.text((dx, bg_y), f"  {tool}:", font=f_term, fill=RED)
    d.text((dx + 150, bg_y), f'"{desc}"', font=f_term, fill=RED)

dy += 3 * 24 + 16

# Arrow and count
d.text((dx, dy), "▼ 48 tools lost safety warnings in one patch", font=f_term_b, fill=AMBER)

# === BOTTOM: The fix ===
y_fix = 480

d.text((50, y_fix), "The fix:", font=f_head, fill=FG)
d.text((50, y_fix + 35), "$ npx rugsnare scan && rugsnare diff", font=font("consolab.ttf", 22), fill=GREEN)
d.text((50, y_fix + 65), "exit 1 = build fails = you review the change", font=f_label, fill=DIM)

# Right side of bottom
d.text((650, y_fix), "48", font=f_num, fill=RED)
d.text((800, y_fix + 15), "warnings silently deleted", font=f_label, fill=FG)
d.text((800, y_fix + 35), "in a single patch update", font=f_label, fill=FG)
d.text((800, y_fix + 55), "that npm installed automatically", font=f_label, fill=AMBER)

# Footer
d.text((50, H - 40), "github.com/Paraphern/rugsnare", font=f_smal, fill=DIM)
d.text((400, H - 40), "zero deps · no telemetry · Apache-2.0 · 247 tests", font=f_smal, fill=DIM)

# Red warning bar
d.rectangle([0, H - 6, W, H], fill=RED)

img.save("content/villains-card.png")
print("saved content/villains-card.png")
