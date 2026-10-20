"""Renders the 8-second Zirplus intro (1920x1080, 30 fps, H.264) frame by frame with Pillow and pipes it to ffmpeg.
Usage: python render_intro.py <fonts dir> <out.mp4> [--preview <dir>]"""
import math
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

FONTS = Path(sys.argv[1])
OUT = Path(sys.argv[2])
PREVIEW = Path(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[3] == "--preview" else None

W, H, FPS, SECONDS = 1920, 1080, 30, 8
INK = (13, 13, 15)
IVORY = (243, 238, 230)
MUTED = (154, 149, 141)
STOPS = [(0.0, (196, 226, 169)), (0.38, (244, 226, 163)), (0.68, (245, 195, 156)), (1.0, (242, 169, 177))]

PROMPT = str(FONTS / "prompt/files/prompt-latin-300-normal.woff")
PROMPT_LIGHT = str(FONTS / "prompt/files/prompt-latin-200-normal.woff")
MONO = str(FONTS / "ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff")


# ----------------------------------------------------------------------------- easing and timing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def seg(t, start, end):
    return clamp((t - start) / (end - start))


def ease_out_cubic(x):
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out_back(x, s=1.9):
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def lerp(a, b, x):
    return a + (b - a) * x


def gradient_color(x):
    x = clamp(x)
    for (p0, c0), (p1, c1) in zip(STOPS, STOPS[1:]):
        if x <= p1:
            k = (x - p0) / (p1 - p0)
            return tuple(round(lerp(c0[i], c1[i], k)) for i in range(3))
    return STOPS[-1][1]


# ----------------------------------------------------------------------------- the mark
SS = 3  # supersampling for crisp, anti-aliased edges


def gradient_image(size, p0, p1):
    """A linear gradient across `size`, from p0 to p1 (in canvas px), using the brand stops."""
    w, h = size
    small = Image.new("RGB", (max(1, w // 4), max(1, h // 4)))
    px = small.load()
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    dd = dx * dx + dy * dy
    for y in range(small.height):
        for x in range(small.width):
            X, Y = x * 4, y * 4
            px[x, y] = gradient_color(((X - p0[0]) * dx + (Y - p0[1]) * dy) / dd)
    return small.resize(size, Image.BILINEAR)


_grad_cache = {}


def draw_mark(size_px, bar1, band, bar2, plus):
    """The mark at `size_px` (its 64-unit box), with each part's build progress in [0, 1]. Returns RGBA."""
    k = size_px * SS / 64.0
    n = round(64 * k)
    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    u = lambda v: v * k  # noqa: E731

    if n not in _grad_cache:
        _grad_cache[n] = gradient_image((n, n), (u(12), u(41)), (u(46), u(23)))
    grad = _grad_cache[n]

    def bar(y, p):
        if p <= 0:
            return
        d.rounded_rectangle([u(12), u(y), u(12 + 34 * p), u(y + 7)], radius=u(1.2), fill=IVORY + (255,))

    bar(16, bar1)
    bar(41, bar2)

    if band > 0:
        # The band grows along its own axis, from the bottom-left foot up to the top-right.
        p = band
        tl = (lerp(12, 37, p), lerp(41, 23, p))
        tr = (lerp(21, 46, p), lerp(41, 23, p))
        mask = Image.new("L", (n, n), 0)
        ImageDraw.Draw(mask).polygon([(u(12), u(41)), (u(21), u(41)), (u(tr[0]), u(tr[1])), (u(tl[0]), u(tl[1]))], fill=255)
        layer.paste(grad, (0, 0), mask)

    if plus > 0:
        s = ease_out_back(plus)
        cx, cy = 53.0, 12.0
        mask = Image.new("L", (n, n), 0)
        md = ImageDraw.Draw(mask)
        half_len, half_w = 6 * s, 1.6 * min(1.0, s)
        md.rounded_rectangle([u(cx - half_w), u(cy - half_len), u(cx + half_w), u(cy + half_len)], radius=u(half_w), fill=255)
        md.rounded_rectangle([u(cx - half_len), u(cy - half_w), u(cx + half_len), u(cy + half_w)], radius=u(half_w), fill=255)
        layer.paste(grad, (0, 0), mask)

    return layer.resize((size_px, size_px), Image.LANCZOS)


# ----------------------------------------------------------------------------- text helpers
def tracked_width(font, text, tracking):
    return sum(font.getlength(c) for c in text) + tracking * (len(text) - 1)


def draw_tracked(img, xy, text, font, tracking, color, alphas):
    """Draws `text` letter by letter with extra tracking; alphas[i] fades each letter."""
    x, y = xy
    for c, a in zip(text, alphas):
        if a > 0:
            glyph = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(glyph).text((x, y), c, font=font, fill=color + (round(255 * a),), anchor="ls")
            img.alpha_composite(glyph)
        x += font.getlength(c) + tracking


def draw_centered(img, cy, text, font, color, alpha, dy=0.0):
    if alpha <= 0:
        return
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((W / 2, cy + dy), text, font=font, fill=color + (round(255 * alpha),), anchor="ms")
    img.alpha_composite(layer)


# ----------------------------------------------------------------------------- composition
F_WORD = ImageFont.truetype(PROMPT, 64)
F_TAG = ImageFont.truetype(PROMPT_LIGHT, 58)
F_MONO = ImageFont.truetype(MONO, 22)
WORD = "ZIRPLUS"
TRACK = 64 * 0.42
WORD_W = tracked_width(F_WORD, WORD, TRACK)
LOCK_MARK = 150
LOCK_GAP = 34
LOCK_Y = 430  # vertical centre of the lockup
LOCK_X0 = W / 2 - (LOCK_MARK + LOCK_GAP + WORD_W) / 2
INTRO_MARK = 340


def frame(t):
    img = Image.new("RGBA", (W, H), INK + (255,))

    # Slow push-in on the whole scene, plus faint orbit rings breathing behind it.
    push = 1.0 + 0.035 * ease_in_out(seg(t, 0, 8))
    rings = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rings)
    ring_in = ease_out_cubic(seg(t, 0.0, 2.5))
    for r, a in ((520, 15), (360, 11)):
        rr = r * (0.9 + 0.1 * ring_in) * push
        rd.ellipse([W / 2 - rr, LOCK_Y + 40 - rr, W / 2 + rr, LOCK_Y + 40 + rr], outline=IVORY + (round(a * ring_in),), width=2)
    img.alpha_composite(rings)

    # Mark build.
    bar1 = ease_out_cubic(seg(t, 0.25, 0.85))
    band = ease_in_out(seg(t, 0.70, 1.35))
    bar2 = ease_out_cubic(seg(t, 1.15, 1.75))
    plus = seg(t, 1.65, 2.15)

    # Glide from the large centred mark into the lockup.
    g = ease_in_out(seg(t, 2.35, 3.25))
    size = round(lerp(INTRO_MARK, LOCK_MARK, g) * push)
    cx = lerp(W / 2, LOCK_X0 + LOCK_MARK / 2, g)
    cy = lerp(H / 2 - 20, LOCK_Y, g)
    cx = W / 2 + (cx - W / 2) * push
    cy = H / 2 + (cy - H / 2) * push
    mark = draw_mark(size, bar1, band, bar2, plus)
    # The drawing (x 12-59, y 6-48 of 64) is off-centre in its box; centre it optically while it stands alone,
    # easing the correction out as it settles into the lockup.
    ox, oy = (32 - 35.5) * size / 64 * (1 - g), (32 - 27) * size / 64 * (1 - g)
    img.alpha_composite(mark, (round(cx - size / 2 + ox), round(cy - size / 2 + oy)))

    # Wordmark, letter by letter.
    if t >= 2.7:
        alphas = [ease_out_cubic(seg(t, 2.75 + i * 0.07, 3.15 + i * 0.07)) for i in range(len(WORD))]
        wx = W / 2 + (LOCK_X0 + LOCK_MARK + LOCK_GAP - W / 2) * push
        wy = H / 2 + (LOCK_Y + 23 - H / 2) * push
        draw_tracked(img, (wx, wy), WORD, F_WORD, TRACK, IVORY, alphas)

    # Tagline and chain line.
    a1 = ease_out_cubic(seg(t, 3.6, 4.5))
    draw_centered(img, 640, "Tokenized stocks, priced at the oracle.", F_TAG, IVORY, a1, dy=24 * (1 - a1))
    a2 = ease_out_cubic(seg(t, 4.4, 5.2))
    draw_centered(img, 712, "LIVE ON ROBINHOOD CHAIN  ·  SETTLED IN USDG", F_MONO, MUTED, a2, dy=14 * (1 - a2))

    # Pastel line sweeps out from the centre along the bottom.
    sweep = ease_in_out(seg(t, 5.0, 6.2))
    if sweep > 0:
        half = W / 2 * sweep
        bar_img = Image.new("RGBA", (W, 6))
        bd = ImageDraw.Draw(bar_img)
        for x in range(round(W / 2 - half), round(W / 2 + half)):
            bd.line([(x, 0), (x, 5)], fill=gradient_color(x / W) + (235,))
        img.alpha_composite(bar_img, (0, H - 6))

    # Fade to ink for a clean cut into the demo.
    out = seg(t, 7.6, 8.0)
    if out > 0:
        img.alpha_composite(Image.new("RGBA", (W, H), INK + (round(255 * ease_in_out(out)),)))
    return img.convert("RGB")


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(OUT),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = FPS * SECONDS
    keep = {round(s * FPS) for s in (0.6, 1.1, 1.9, 2.8, 3.6, 4.6, 6.4, 7.8)}
    for i in range(total):
        img = frame(i / FPS)
        proc.stdin.write(img.tobytes())
        if PREVIEW and i in keep:
            PREVIEW.mkdir(parents=True, exist_ok=True)
            img.resize((640, 360), Image.LANCZOS).save(PREVIEW / f"f{i:03d}.png")
        if i % 30 == 0:
            print(f"frame {i}/{total}", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg failed")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
