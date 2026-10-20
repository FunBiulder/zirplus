"""Builds the Zirplus app hero image (3200x1800): a tilted phone with the swap ticket and floating market cards.
Usage: python -I make_hero.py <frontend dir> <out.png>"""
import pathlib
import re
import subprocess
import sys

from PIL import Image

FRONT = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
WORK = pathlib.Path(__file__).parent
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# Live Chainlink mids (USDG per token), read from Robinhood Chain on 2026-10-20 ~09:00 UTC.
MIDS = {"NVDA": 217.07, "AAPL": 340.78, "TSLA": 367.94, "MSFT": 535.30, "PLTR": 193.90}
NVDA_INV = 50.4  # NVDA vault token share, live

# Issuer marks from the app's own TokenLogo.tsx (Simple Icons, CC0), drawn one colour like in the app.
src = (FRONT / "src/components/platform/TokenLogo.tsx").read_text(encoding="utf-8")
PATHS = {k: v for k, v in re.findall(r'^\s+([A-Z]+X): \{ title: "[^"]+", path: "([^"]+)"', src, re.M)}

font = lambda rel: (FRONT / "node_modules" / rel).as_uri()  # noqa: E731
F_PROMPT3 = font("@fontsource/prompt/files/prompt-latin-300-normal.woff2")
F_PROMPT4 = font("@fontsource/prompt/files/prompt-latin-400-normal.woff2")
F_OUTFIT = font("@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2")
F_MONO = font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2")

GRAD = "linear-gradient(100deg,#c4e2a9 0%,#f4e2a3 34%,#f5c39c 64%,#f2a9b1 100%)"
STOPS = '<stop offset="0" stop-color="#c4e2a9"/><stop offset="0.38" stop-color="#f4e2a3"/><stop offset="0.68" stop-color="#f5c39c"/><stop offset="1" stop-color="#f2a9b1"/>'


def mark(size, gid):
    return f'''<svg width="{size}" height="{size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="{gid}" x1="12" y1="41" x2="46" y2="23" gradientUnits="userSpaceOnUse">{STOPS}</linearGradient></defs>
<rect x="12" y="16" width="34" height="7" rx="1.2" fill="#F3EEE6"/><polygon points="37,23 46,23 21,41 12,41" fill="url(#{gid})"/>
<rect x="12" y="41" width="34" height="7" rx="1.2" fill="#F3EEE6"/><rect x="51.4" y="6" width="3.2" height="12" rx="1.6" fill="url(#{gid})"/>
<rect x="47" y="10.4" width="12" height="3.2" rx="1.6" fill="url(#{gid})"/></svg>'''


def logo(sym):
    return f'<div class="logo"><svg viewBox="0 0 24 24" width="26" height="26"><path d="{PATHS[sym + "X"]}" fill="#F3EEE6"/></svg></div>'


def card(sym, name, tier, half_bps, band_bps, live, style):
    mid = f"{MIDS[sym]:,.2f}"
    if live:
        right = f'''<div class="kv r"><span class="k">Token share</span><span class="v num">{NVDA_INV:.1f}%</span></div>'''
        meter = f'''<div class="meter"><div class="fill" style="width:{NVDA_INV}%"></div><div class="tick" style="left:50%"></div></div>
<div class="foot"><span>Vault inventory</span><span class="chip live">● Vault live</span></div>'''
    else:
        right = f'''<div class="kv r"><span class="k">Oracle band</span><span class="v num">±{band_bps} bps</span></div>'''
        w = 22 + band_bps / 300 * 50
        meter = f'''<div class="meter band"><div class="bandfill" style="left:{50 - w / 2}%;width:{w}%"></div><div class="tick mid" style="left:50%"></div></div>
<div class="foot"><span>Quotes held inside the band</span><span class="chip">Vault soon</span></div>'''
    return f'''<div class="card" style="{style}">
<div class="head">{logo(sym)}<div class="ttl"><div class="name">{name}</div><div class="sub">{sym}x · Tier {tier}</div></div><span class="bps num">{half_bps} bps</span></div>
<div class="rule"></div>
<div class="row"><div class="kv"><span class="k">Chainlink mid</span><span class="v num big">{mid}<small> USDG</small></span></div>{right}</div>
{meter}</div>'''


mid = MIDS["NVDA"]
amount_in = 100.0
out = amount_in * (1 - 0.0002) / (mid * 1.001)
min_out = out * (1 - 0.0015)

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Prompt;font-weight:300;src:url("{F_PROMPT3}") format("woff2")}}
@font-face{{font-family:Prompt;font-weight:400;src:url("{F_PROMPT4}") format("woff2")}}
@font-face{{font-family:Outfit;font-weight:100 900;src:url("{F_OUTFIT}") format("woff2")}}
@font-face{{font-family:Plex;font-weight:400;src:url("{F_MONO}") format("woff2")}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:1600px;height:900px;overflow:hidden;background:#0a0b0f}}
body{{font-family:Outfit,sans-serif;color:#F3EEE6;position:relative}}
.num{{font-variant-numeric:tabular-nums}}
.bg{{position:absolute;inset:0;background:
  radial-gradient(62% 72% at 52% 50%,#1b2030 0%,#121521 45%,#0a0b10 82%)}}
.grid{{position:absolute;left:-10%;right:-10%;top:30%;height:120%;transform:perspective(900px) rotateX(62deg);transform-origin:50% 0;
  background-image:linear-gradient(rgba(243,238,230,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(243,238,230,.05) 1px,transparent 1px);
  background-size:64px 64px;-webkit-mask-image:radial-gradient(50% 60% at 50% 20%,#000 0%,transparent 75%)}}
.ring{{position:absolute;border-radius:50%;border:1px solid rgba(243,238,230,.06)}}
.star{{position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(243,238,230,.35)}}
.glow{{position:absolute;left:50%;top:52%;width:760px;height:560px;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(closest-side,rgba(245,195,156,.10),rgba(196,226,169,.05) 55%,transparent 100%);filter:blur(20px)}}

/* phone */
.stage{{position:absolute;left:54%;top:55%;transform:translate(-50%,-50%) perspective(2400px) rotateX(16deg) rotateZ(-13deg) rotateY(-6deg) scale(.9);}}
.phone{{width:390px;height:820px;border-radius:62px;padding:11px;background:linear-gradient(150deg,#2a2c34,#121318 40%,#1d1f26);
  box-shadow:0 60px 120px -30px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08) inset,0 30px 60px -20px rgba(245,195,156,.08)}}
.screen{{width:100%;height:100%;border-radius:52px;background:#0f1014;overflow:hidden;position:relative;padding:18px 20px}}
.island{{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:118px;height:34px;border-radius:20px;background:#000}}
.status{{display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:15px;padding:4px 14px 0}}
.sicons{{display:flex;gap:6px;align-items:center}}
.app{{margin-top:22px}}
.topbar{{display:flex;align-items:center;justify-content:space-between}}
.brand{{display:flex;align-items:center;gap:8px;font-family:Prompt;font-weight:300;letter-spacing:.3em;font-size:12px}}
.sess{{display:flex;align-items:center;gap:6px;font-family:Plex;font-size:10.5px;letter-spacing:.12em;padding:6px 10px;border-radius:99px;border:1px solid rgba(196,226,169,.35);color:#c4e2a9}}
.h1{{font-family:Prompt;font-weight:300;font-size:27px;line-height:1.12;margin-top:22px;letter-spacing:-.01em}}
.h1 span{{background:{GRAD};-webkit-background-clip:text;color:transparent}}
.lede{{font-size:12.5px;line-height:1.55;color:#a8a299;margin-top:8px}}
.box{{margin-top:14px;border-radius:20px;background:#17181d;padding:14px 16px;border:1px solid rgba(255,255,255,.06)}}
.lbl{{font-family:Plex;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#8f8a82}}
.amt{{display:flex;justify-content:space-between;align-items:center;margin-top:6px}}
.amt b{{font-family:Prompt;font-weight:300;font-size:30px}}
.tok{{display:flex;align-items:center;gap:6px;padding:5px 11px 5px 5px;border-radius:99px;border:1px solid rgba(255,255,255,.14);font-size:13px;font-weight:500}}
.tok i{{width:22px;height:22px;border-radius:50%;background:#26272d;display:grid;place-items:center}}
.flip{{display:flex;justify-content:center;margin:-10px 0}}
.flip div{{width:32px;height:32px;border-radius:50%;background:{GRAD};box-shadow:0 0 0 5px #0f1014;display:grid;place-items:center;position:relative;z-index:2}}
.receipt{{margin-top:12px;border-radius:18px;background:#fbf6ef;color:#2a2724;padding:12px 14px}}
.rr{{display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px dotted rgba(42,39,36,.25)}}
.rr:last-child{{border-bottom:0}}
.rr span:first-child{{color:rgba(42,39,36,.65)}}
.route{{margin-top:10px;display:flex;justify-content:space-between;font-size:11.5px;color:#d2ccc3;padding:0 2px}}
.facts{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}}
.facts div{{border-radius:14px;background:#17181d;border:1px solid rgba(255,255,255,.06);padding:9px 10px;display:flex;flex-direction:column;gap:3px}}
.facts b{{font-family:Prompt;font-weight:300;font-size:17px}}
.facts small{{font-size:9.5px;color:#8f8a82}}
.cta{{margin-top:12px;height:48px;border-radius:99px;background:{GRAD};color:#1d1b19;display:grid;place-items:center;font-weight:600;font-size:14px;letter-spacing:.02em}}

/* cards */
.card{{position:absolute;width:330px;padding:16px 18px 14px;border-radius:22px;
  background:linear-gradient(160deg,rgba(38,40,50,.92),rgba(20,21,27,.92));border:1px solid rgba(243,238,230,.10);
  box-shadow:0 40px 80px -30px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.06) inset}}
.head{{display:flex;align-items:center;gap:12px}}
.logo{{width:44px;height:44px;border-radius:13px;background:#0b0c10;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08)}}
.ttl .name{{font-family:Prompt;font-weight:400;font-size:19px;line-height:1.1}}
.ttl .sub{{font-family:Plex;font-size:11px;letter-spacing:.08em;color:#a8a299;margin-top:3px}}
.bps{{margin-left:auto;font-family:Plex;font-size:12px;padding:5px 10px;border-radius:99px;border:1px solid rgba(243,238,230,.22);color:#d2ccc3}}
.card .rule{{height:1px;background:rgba(243,238,230,.08);margin:12px 0}}
.row{{display:flex;justify-content:space-between;align-items:flex-end}}
.kv{{display:flex;flex-direction:column;gap:3px}}
.kv.r{{align-items:flex-end}}
.k{{font-size:11.5px;color:#a8a299}}
.v{{font-size:18px;font-weight:500}}
.v.big{{font-family:Prompt;font-weight:300;font-size:26px}}
.v small{{font-family:Outfit;font-size:11px;color:#a8a299;font-weight:400}}
.meter{{position:relative;height:4px;border-radius:4px;background:rgba(243,238,230,.08);margin-top:12px}}
.fill{{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:{GRAD}}}
.tick{{position:absolute;top:-4px;width:1px;height:12px;background:rgba(243,238,230,.55)}}
.bandfill{{position:absolute;top:0;bottom:0;border-radius:4px;background:{GRAD};opacity:.55}}
.tick.mid{{background:#F3EEE6;width:2px}}
.foot{{display:flex;justify-content:space-between;align-items:center;margin-top:9px;font-size:10.5px;color:#8f8a82}}
.chip{{font-family:Plex;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;border:1px solid rgba(243,238,230,.15);color:#a8a299}}
.chip.live{{border-color:rgba(196,226,169,.4);color:#c4e2a9}}
.wm{{position:absolute;left:44px;top:38px;display:flex;align-items:center;gap:12px;font-family:Prompt;font-weight:300;letter-spacing:.38em;font-size:15px}}
.wm em{{font-style:normal;font-family:Plex;letter-spacing:.18em;font-size:10.5px;color:#8f8a82;margin-left:14px;padding-left:14px;border-left:1px solid rgba(243,238,230,.15)}}
</style></head><body>
<div class="bg"></div><div class="grid"></div><div class="glow"></div>
<div class="ring" style="left:420px;top:60px;width:760px;height:760px"></div>
<div class="ring" style="left:540px;top:180px;width:520px;height:520px"></div>
{"".join(f'<div class="star" style="left:{x}px;top:{y}px;opacity:{o}"></div>' for x, y, o in [(140,90,.6),(260,620,.4),(90,430,.5),(1500,120,.6),(1420,520,.4),(1530,760,.5),(980,40,.4),(720,860,.3),(330,820,.5),(1180,860,.4),(60,250,.3),(1560,300,.35)])}

<div class="wm">{mark(30, "wm")}ZIRPLUS</div>

{card("NVDA", "NVIDIA", "A", 10, 75, True, "left:262px;top:64px;transform:rotate(-6deg)")}
{card("AAPL", "Apple", "A", 10, 75, False, "left:70px;top:330px;transform:rotate(-11deg)")}
{card("PLTR", "Palantir", "C", 40, 300, False, "left:200px;top:640px;transform:rotate(-7deg)")}
{card("TSLA", "Tesla", "B", 20, 150, False, "left:1130px;top:120px;transform:rotate(7deg)")}
{card("MSFT", "Microsoft", "A", 10, 75, False, "left:1160px;top:500px;transform:rotate(9deg)")}

<div class="stage"><div class="phone"><div class="screen">
  <div class="island"></div>
  <div class="status"><span>9:41</span><span class="sicons">
    <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="#F3EEE6"/><rect x="4.5" y="5" width="3" height="6" rx="1" fill="#F3EEE6"/><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="#F3EEE6"/><rect x="13.5" y="0" width="3" height="11" rx="1" fill="#F3EEE6"/></svg>
    <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" fill="none" stroke="#F3EEE6" stroke-opacity=".5"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#F3EEE6"/><rect x="23" y="4" width="1.6" height="4" rx=".8" fill="#F3EEE6" fill-opacity=".5"/></svg></span></div>
  <div class="app">
    <div class="topbar"><div class="brand">{mark(24, "pm")}ZIRPLUS</div><div class="sess"><span style="width:6px;height:6px;border-radius:50%;background:#c4e2a9;display:inline-block"></span>OPEN ×1.0</div></div>
    <div class="h1">Swap stocks at<br><span>the oracle price.</span></div>
    <div class="lede">Chainlink mid, a published spread and a 2 bps fee. Nothing hidden.</div>
    <div class="box"><div class="lbl">You pay</div><div class="amt"><b class="num">100.00</b><span class="tok"><i style="font-size:10px;font-weight:700">$</i>USDG</span></div></div>
    <div class="flip"><div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d1b19" stroke-width="2.4" stroke-linecap="round"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></svg></div></div>
    <div class="box"><div class="lbl">You receive</div><div class="amt"><b class="num">{out:.4f}</b><span class="tok"><i><svg viewBox="0 0 24 24" width="13" height="13"><path d="{PATHS["NVDAX"]}" fill="#F3EEE6"/></svg></i>NVDAx</span></div></div>
    <div class="receipt">
      <div class="rr"><span>Chainlink mid</span><span class="num">{mid:,.2f} USDG</span></div>
      <div class="rr"><span>Spread · Tier A</span><span class="num">10 bps</span></div>
      <div class="rr"><span>Fee</span><span class="num">2 bps</span></div>
      <div class="rr"><span>Min. received</span><span class="num">{min_out:.4f} NVDAx</span></div>
    </div>
    <div class="route"><span>● Route: Zirplus vault</span><span>Uniswap compared</span></div>
    <div class="cta">Swap USDG for NVDAx</div>
    <div class="facts">
      <div><span class="lbl">Max trade</span><b class="num">50,000</b><small>USDG · regular</small></div>
      <div><span class="lbl">Oracle band</span><b class="num">±75</b><small>bps · Tier A</small></div>
      <div><span class="lbl">Settles</span><b>Atomic</b><small>on Robinhood Chain</small></div>
    </div>
  </div>
</div></div></div>
</body></html>'''

page = WORK / "hero.html"
page.write_text(html, encoding="utf-8")
shot = WORK / "hero_raw.png"
subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                "--window-size=1600,900", f"--screenshot={shot}", page.as_uri()], check=True, capture_output=True, timeout=120)
img = Image.open(shot).convert("RGB")
if img.size != (3200, 1800):
    img = img.crop((0, 0, 3200, 1800))
OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, optimize=True)
img.resize((1600, 900), Image.LANCZOS).save(WORK / "hero_preview.png")
print("wrote", OUT, img.size, f"(swap example: 100 USDG -> {out:.4f} NVDAx at mid {mid})")
