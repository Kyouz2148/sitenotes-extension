"""Generate SiteNotes extension icons and Chrome Web Store promotional assets."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "extension" / "icons"
STORE_DIR = ROOT / "store"


def load_font(size: int, bold: bool = False):
    candidates = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ]
    )
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def draw_brand_icon(size: int) -> Image.Image:
    """Draws a crisp supersampled SiteNotes icon at the target square size."""
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded square with vertical indigo-to-violet gradient
    pad = int(s * 0.06)
    radius = int(s * 0.22)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([pad, pad, s - pad, s - pad], radius=radius, fill=255)

    grad = Image.new("RGBA", (s, s))
    gdraw = ImageDraw.Draw(grad)
    top_rgb = (99, 102, 241)     # #6366F1
    bot_rgb = (67, 56, 202)      # #4338CA
    for y in range(s):
        t = y / max(1, s - 1)
        r = int(top_rgb[0] + (bot_rgb[0] - top_rgb[0]) * t)
        g = int(top_rgb[1] + (bot_rgb[1] - top_rgb[1]) * t)
        b = int(top_rgb[2] + (bot_rgb[2] - top_rgb[2]) * t)
        gdraw.line([(0, y), (s, y)], fill=(r, g, b, 255))

    img.paste(grad, (0, 0), mask)

    # White note card inside
    card_l = int(s * 0.22)
    card_t = int(s * 0.20)
    card_r = int(s * 0.78)
    card_b = int(s * 0.80)
    card_rad = int(s * 0.10)
    draw.rounded_rectangle(
        [card_l, card_t, card_r, card_b],
        radius=card_rad,
        fill=(255, 255, 255, 255),
    )

    # Subtle top accent bar on note
    bar_h = max(scale, int(s * 0.05))
    draw.rounded_rectangle(
        [int(s * 0.30), int(s * 0.31), int(s * 0.62), int(s * 0.31) + bar_h],
        radius=bar_h // 2,
        fill=(99, 102, 241, 255),
    )

    # Two checklist lines + emerald checkmark badge
    line_h = max(scale, int(s * 0.042))
    draw.rounded_rectangle(
        [int(s * 0.30), int(s * 0.44), int(s * 0.70), int(s * 0.44) + line_h],
        radius=line_h // 2,
        fill=(203, 213, 225, 255),
    )
    draw.rounded_rectangle(
        [int(s * 0.30), int(s * 0.56), int(s * 0.56), int(s * 0.56) + line_h],
        radius=line_h // 2,
        fill=(203, 213, 225, 255),
    )

    # Emerald circular check badge in bottom-right
    cx, cy = int(s * 0.72), int(s * 0.72)
    cr = int(s * 0.15)
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(16, 185, 129, 255))
    stroke = max(2, int(s * 0.038))
    p1 = (cx - int(cr * 0.42), cy + int(cr * 0.02))
    p2 = (cx - int(cr * 0.08), cy + int(cr * 0.36))
    p3 = (cx + int(cr * 0.46), cy - int(cr * 0.32))
    draw.line([p1, p2, p3], fill=(255, 255, 255, 255), width=stroke, joint="curve")

    return img.resize((size, size), Image.Resampling.LANCZOS)


def generate_icons():
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        icon = draw_brand_icon(size)
        icon.save(ICONS_DIR / f"icon{size}.png", format="PNG")
        print(f"Generated icon{size}.png")


def generate_promo_tile(width: int, height: int, filename: str):
    img = Image.new("RGB", (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Soft indigo gradient background
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(30 + 25 * t)
        g = int(27 + 20 * t)
        b = int(75 + 45 * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    icon_size = int(min(height * 0.40, width * 0.24))
    icon = draw_brand_icon(icon_size)
    ix = int(width * 0.08)
    iy = (height - icon_size) // 2
    img.paste(icon, (ix, iy), icon)

    tx = ix + icon_size + int(width * 0.05)
    title_font = load_font(int(min(height * 0.16, width * 0.095)), bold=True)
    sub_font = load_font(int(min(height * 0.072, width * 0.042)), bold=False)

    draw.text((tx, iy + int(icon_size * 0.08)), "SiteNotes", font=title_font, fill=(255, 255, 255))
    if width < 600:
        draw.text(
            (tx, iy + int(icon_size * 0.50)),
            "Notes & Checklists",
            font=sub_font,
            fill=(199, 210, 254),
        )
        draw.text(
            (tx, iy + int(icon_size * 0.76)),
            "in Chrome Side Panel",
            font=sub_font,
            fill=(165, 180, 252),
        )
    else:
        draw.text(
            (tx, iy + int(icon_size * 0.54)),
            "Contextual Notes & Checklists in Chrome Side Panel",
            font=sub_font,
            fill=(199, 210, 254),
        )

    out = STORE_DIR / filename
    img.save(out, format="PNG")
    print(f"Generated {filename}")


def generate_screenshot_1():
    """Generates 1280x800 Chrome Web Store screenshot showing Side Panel alongside a webpage."""
    w, h = 1280, 800
    img = Image.new("RGB", (w, h), (226, 232, 240))
    draw = ImageDraw.Draw(img)

    # Browser window frame
    draw.rounded_rectangle([28, 28, 1252, 772], radius=16, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    # Browser top bar
    draw.rectangle([28, 28, 1252, 92], fill=(241, 245, 249))
    for i, col in enumerate(((244, 63, 94), (245, 158, 11), (16, 185, 129))):
        cx = 58 + i * 22
        draw.ellipse([cx - 6, 54 - 6, cx + 6, 54 + 6], fill=col)

    # Address bar
    f_ui = load_font(16, bold=False)
    f_bold = load_font(18, bold=True)
    f_h1 = load_font(28, bold=True)
    f_sm = load_font(14, bold=False)

    draw.rounded_rectangle([160, 42, 1180, 78], radius=18, fill=(255, 255, 255), outline=(203, 213, 225))
    draw.text((185, 50), "https://docs.developer.chrome.com/side-panel-guide", font=f_ui, fill=(71, 85, 105))

    # Left webpage mockup
    draw.text((78, 140), "Building Better Web Workflows", font=f_h1, fill=(15, 23, 42))
    draw.text((78, 186), "Research article • Updated 2026", font=f_sm, fill=(100, 116, 139))
    for idx, width_px in enumerate((680, 640, 690, 520)):
        y = 240 + idx * 32
        draw.rounded_rectangle([78, y, 78 + width_px, y + 14], radius=7, fill=(226, 232, 240))

    draw.rounded_rectangle([78, 405, 760, 515], radius=12, fill=(238, 242, 255), outline=(199, 210, 254))
    draw.text((100, 428), "Key insight highlighted on page:", font=f_bold, fill=(67, 56, 202))
    draw.text((100, 462), "\"Keep contextual checklists alongside the exact URL you are working on.\"", font=f_ui, fill=(30, 41, 59))

    # Right Chrome Side Panel (SiteNotes)
    px1, py1, px2, py2 = 850, 92, 1252, 772
    draw.rectangle([px1, py1, px2, py2], fill=(248, 250, 252), outline=(203, 213, 225), width=2)
    draw.rectangle([px1, py1, px2, py1 + 56], fill=(255, 255, 255))

    icon28 = draw_brand_icon(28)
    img.paste(icon28, (px1 + 16, py1 + 14), icon28)
    draw.text((px1 + 54, py1 + 17), "SiteNotes", font=f_bold, fill=(15, 23, 42))

    # Scope segmented tabs
    draw.rounded_rectangle([px1 + 16, py1 + 70, px2 - 16, py1 + 106], radius=10, fill=(226, 232, 240))
    draw.rounded_rectangle([px1 + 20, py1 + 74, px1 + 142, py1 + 102], radius=8, fill=(255, 255, 255))
    draw.text((px1 + 42, py1 + 79), "This Page", font=f_sm, fill=(15, 23, 42))
    draw.text((px1 + 172, py1 + 79), "This Site", font=f_sm, fill=(71, 85, 105))
    draw.text((px1 + 286, py1 + 79), "Scratchpad", font=f_sm, fill=(71, 85, 105))

    # Editor card inside Side Panel
    cx1, cy1, cx2, cy2 = px1 + 16, py1 + 122, px2 - 16, py2 - 20
    draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=2)
    draw.rectangle([cx1, cy1, cx2, cy1 + 5], fill=(79, 70, 229))
    draw.text((cx1 + 16, cy1 + 20), "Chrome Side Panel Research", font=f_bold, fill=(15, 23, 42))

    draw.rounded_rectangle([cx1 + 16, cy1 + 64, cx2 - 16, cy1 + 215], radius=10, fill=(241, 245, 249))
    draw.text((cx1 + 28, cy1 + 78), "> Keep contextual checklists alongside", font=f_sm, fill=(51, 65, 85))
    draw.text((cx1 + 28, cy1 + 100), "  the exact URL you are working on.", font=f_sm, fill=(51, 65, 85))
    draw.text((cx1 + 28, cy1 + 134), "• Minimal MV3 permissions", font=f_sm, fill=(51, 65, 85))
    draw.text((cx1 + 28, cy1 + 158), "• Export clean Markdown anytime", font=f_sm, fill=(51, 65, 85))

    # Checklist inside Side Panel
    draw.text((cx1 + 16, cy1 + 236), "CHECKLIST   2/3", font=f_sm, fill=(79, 70, 229))
    tasks = [
        (True, "Review MV3 sidePanel API docs"),
        (True, "Add bilingual EN + PT-BR support"),
        (False, "Export summary to team Markdown"),
    ]
    for i, (done, label) in enumerate(tasks):
        ty = cy1 + 268 + i * 44
        draw.rounded_rectangle([cx1 + 16, ty, cx2 - 16, ty + 36], radius=8, fill=(248, 250, 252))
        box_col = (79, 70, 229) if done else (148, 163, 184)
        draw.rounded_rectangle([cx1 + 26, ty + 10, cx1 + 42, ty + 26], radius=4, fill=box_col if done else None, outline=box_col, width=2)
        text_col = (148, 163, 184) if done else (15, 23, 42)
        draw.text((cx1 + 54, ty + 10), label, font=f_sm, fill=text_col)

    out = STORE_DIR / "screenshot-1-1280x800.png"
    img.save(out, format="PNG")
    print("Generated screenshot-1-1280x800.png")


def generate_screenshot_2():
    """Generates 1280x800 screenshot highlighting All Notes search & dark mode."""
    w, h = 1280, 800
    img = Image.new("RGB", (w, h), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    f_h1 = load_font(34, bold=True)
    f_bold = load_font(20, bold=True)
    f_ui = load_font(16, bold=False)
    f_sm = load_font(14, bold=False)

    # Left marketing highlights
    icon72 = draw_brand_icon(72)
    img.paste(icon72, (90, 140), icon72)
    draw.text((90, 236), "Your Browser Memory,", font=f_h1, fill=(248, 250, 252))
    draw.text((90, 280), "100% Private & Local.", font=f_h1, fill=(129, 140, 248))

    bullets = [
        "• Notes & checklists per Page, Website, or Global Scratchpad",
        "• Right-click any text on the web to quote directly",
        "• Search across all websites instantly",
        "• One-click Markdown (.md) & JSON backup export",
        "• Automatic English & Portuguese (PT-BR) interface",
    ]
    for idx, line in enumerate(bullets):
        draw.text((90, 360 + idx * 42), line, font=f_ui, fill=(203, 213, 225))

    # Right Dark-Mode Side Panel Mockup
    px1, py1, px2, py2 = 760, 60, 1190, 740
    draw.rounded_rectangle([px1, py1, px2, py2], radius=18, fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((px1 + 24, py1 + 22), "All Notes (12)", font=f_bold, fill=(248, 250, 252))
    draw.rounded_rectangle([px1 + 24, py1 + 66, px2 - 24, py1 + 106], radius=10, fill=(15, 23, 42), outline=(71, 85, 105))
    draw.text((px1 + 42, py1 + 78), "Search notes, sites, or tasks...", font=f_sm, fill=(148, 163, 184))

    cards = [
        ((79, 70, 229), "Pinned • github.com/Kyouz2148", "Release checklist: update changelog & tag v1.0.0", "3/4"),
        ((16, 185, 129), "developer.chrome.com/docs", "Manifest V3 sidePanel API examples & shortcuts", "2/2"),
        ((245, 158, 11), "figma.com/file/product-ui", "Color tokens: Indigo #4F46E5, Emerald #10B981", "1/3"),
        ((14, 165, 233), "Global Scratchpad", "Weekly priorities and quick links to review", "4/6"),
    ]
    for i, (accent, title, preview, prog) in enumerate(cards):
        cy = py1 + 130 + i * 128
        draw.rounded_rectangle([px1 + 24, cy, px2 - 24, cy + 110], radius=12, fill=(15, 23, 42), outline=(51, 65, 85))
        draw.rectangle([px1 + 24, cy + 10, px1 + 29, cy + 100], fill=accent)
        draw.text((px1 + 42, cy + 16), title, font=f_bold, fill=(248, 250, 252))
        draw.text((px1 + 42, cy + 48), preview, font=f_sm, fill=(148, 163, 184))
        draw.rounded_rectangle([px2 - 84, cy + 74, px2 - 36, cy + 98], radius=8, fill=(51, 65, 85))
        draw.text((px2 - 72, cy + 78), prog, font=f_sm, fill=(129, 140, 248))

    out = STORE_DIR / "screenshot-2-1280x800.png"
    img.save(out, format="PNG")
    print("Generated screenshot-2-1280x800.png")


if __name__ == "__main__":
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    generate_icons()
    generate_promo_tile(440, 280, "promo-small-440x280.png")
    generate_promo_tile(1400, 560, "marquee-1400x560.png")
    generate_screenshot_1()
    generate_screenshot_2()
