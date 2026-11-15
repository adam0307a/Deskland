"""Import external theme packages (.zip/.deskland), HTML pages, images, or videos."""

from __future__ import annotations

import html
import json
import os
import posixpath
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any

from .config import atomic_write, config_dir

ARCHIVE_EXTS = {".zip", ".deskland"}
HTML_EXTS = {".html", ".htm"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".bmp"}
VIDEO_EXTS = {".mp4", ".webm", ".mkv", ".mov"}
SUPPORTED_EXTS = ARCHIVE_EXTS | HTML_EXTS | IMAGE_EXTS | VIDEO_EXTS

MAX_ARCHIVE_BYTES = 150 * 1024 * 1024
MAX_ARCHIVE_FILES = 2000


def custom_themes_dir() -> Path:
    override = os.environ.get("DESKLAND_CUSTOM_THEMES_DIR")
    if override:
        return Path(override).expanduser().resolve()
    return config_dir() / "themes"


def registry_path(custom_dir: Path) -> Path:
    return custom_dir / "registry.json"


def load_custom_themes(custom_dir: Path) -> list[dict[str, Any]]:
    path = registry_path(custom_dir)
    try:
        if not path.exists():
            return []
        data = json.loads(path.read_text(encoding="utf-8"))
        themes = data.get("themes") if isinstance(data, dict) else None
        if not isinstance(themes, list):
            return []
        return [t for t in themes if isinstance(t, dict)]
    except (OSError, ValueError):
        return []


def save_custom_themes(custom_dir: Path, themes: list[dict[str, Any]]) -> None:
    custom_dir.mkdir(parents=True, exist_ok=True)
    raw = json.dumps({"themes": themes}, ensure_ascii=False, indent=2).encode("utf-8")
    atomic_write(registry_path(custom_dir), raw)


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        slug = "theme"
    return f"custom-{slug[:36]}"


def _unique_id(base: str, existing: set[str], custom_dir: Path) -> str:
    candidate = base
    n = 2
    while candidate in existing or (custom_dir / candidate).exists():
        candidate = f"{base}-{n}"
        n += 1
    return candidate


def _pretty_title(stem: str) -> str:
    cleaned = re.sub(r"[-_]+", " ", stem).strip()
    return cleaned or "Imported Theme"


def _extract_html_title(content: str, fallback: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", content, flags=re.IGNORECASE | re.DOTALL)
    if m:
        title = re.sub(r"\s+", " ", html.unescape(m.group(1))).strip()
        if title:
            return title[:60]
    return fallback


def _safe_zip_members(zf: zipfile.ZipFile) -> list[tuple[zipfile.ZipInfo, list[str]]]:
    entries: list[tuple[zipfile.ZipInfo, list[str]]] = []
    total_size = 0
    for info in zf.infolist():
        if info.is_dir():
            continue
        # Reject symlinks (Unix mode 0o120000 in upper 16 bits of external_attr)
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError("Archive contains unsupported symbolic link")
        norm = posixpath.normpath(info.filename.replace("\\", "/"))
        if norm.startswith("/") or norm == ".." or norm.startswith("../"):
            raise ValueError(f"Unsafe archive entry path: {info.filename}")
        parts = [p for p in norm.split("/") if p and p != "."]
        if not parts or any(p == ".." for p in parts):
            raise ValueError(f"Unsafe archive entry path: {info.filename}")
        if parts[0] == "__MACOSX":
            continue
        total_size += max(0, info.file_size)
        if total_size > MAX_ARCHIVE_BYTES:
            raise ValueError("Theme archive exceeds 150 MB size limit")
        if len(entries) >= MAX_ARCHIVE_FILES:
            raise ValueError("Theme archive contains too many files")
        entries.append((info, parts))
    if not entries:
        raise ValueError("Archive contains no files")

    top_dirs = {parts[0] for _, parts in entries if len(parts) > 1}
    has_root_files = any(len(parts) == 1 for _, parts in entries)
    if not has_root_files and len(top_dirs) == 1:
        entries = [(info, parts[1:]) for info, parts in entries]
    return entries


def _find_entry_html(theme_dir: Path, preferred: str | None = None) -> str:
    if preferred is not None:
        if not isinstance(preferred, str) or not preferred.strip():
            raise ValueError("Invalid entry path in theme manifest")
        clean = preferred.strip().lstrip("/").replace("\\", "/")
        cand = (theme_dir / clean).resolve()
        try:
            cand.relative_to(theme_dir.resolve())
        except ValueError as exc:
            raise ValueError(f"Unsafe entry path in theme manifest: {preferred}") from exc
        if not cand.is_file() or cand.suffix.lower() not in HTML_EXTS:
            raise ValueError(f"Entry HTML file not found in archive: {clean}")
        return clean
    if (theme_dir / "index.html").is_file():
        return "index.html"
    root_html = sorted(
        p.name for p in theme_dir.iterdir() if p.is_file() and p.suffix.lower() in HTML_EXTS
    )
    if root_html:
        return root_html[0]
    nested_html = sorted(
        p.relative_to(theme_dir).as_posix()
        for p in theme_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in HTML_EXTS
    )
    if nested_html:
        return nested_html[0]
    raise ValueError("No .html entry page found in archive")


def _sanitize_groups(raw_groups: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_groups, list):
        return []
    clean_groups: list[dict[str, Any]] = []
    for g in raw_groups:
        if not isinstance(g, dict) or not isinstance(g.get("params"), list):
            continue
        clean_params: list[dict[str, Any]] = []
        for p in g["params"]:
            if not isinstance(p, dict):
                continue
            key = str(p.get("key") or "").strip()
            label = str(p.get("label") or key).strip()
            if not key or not re.match(r"^[a-zA-Z0-9_-]+$", key):
                continue
            item: dict[str, Any] = {"key": key, "label": label[:48]}
            if isinstance(p.get("hint"), str):
                item["hint"] = p["hint"][:180]
            if isinstance(p.get("options"), list) and p["options"]:
                opts = [str(o) for o in p["options"][:8]]
                default_idx = int(p.get("default", 0)) if isinstance(p.get("default"), (int, float)) else 0
                item["options"] = opts
                item["default"] = max(0, min(len(opts) - 1, default_idx))
            else:
                try:
                    p_min = float(p.get("min", 0))
                    p_max = float(p.get("max", 1))
                    p_step = float(p.get("step", 0.01))
                    p_def = float(p.get("default", p_min))
                except (TypeError, ValueError):
                    continue
                if p_max <= p_min or p_step <= 0:
                    continue
                item["min"] = p_min
                item["max"] = p_max
                item["step"] = p_step
                item["default"] = max(p_min, min(p_max, p_def))
                if p.get("format") in ("times", "percent"):
                    item["format"] = p["format"]
                elif isinstance(p.get("unit"), str) and p["unit"]:
                    item["unit"] = p["unit"][:12]
            clean_params.append(item)
        if clean_params:
            clean_groups.append({"name": str(g.get("name") or "Settings")[:48], "params": clean_params})
    return clean_groups


def _validate_html_file(path: Path) -> str:
    raw = path.read_bytes()
    if not raw or b"\x00" in raw:
        raise ValueError(f"HTML file is empty or corrupted: {path.name}")
    return raw.decode("utf-8", errors="replace")


def _copy_limited(src_fp, dst_fp, remaining_bytes: int) -> int:
    written = 0
    while True:
        chunk = src_fp.read(65536)
        if not chunk:
            break
        written += len(chunk)
        if written > remaining_bytes:
            raise ValueError("Archive uncompressed size exceeds 150 MB limit")
        dst_fp.write(chunk)
    return written


def _find_archive_thumb(theme_dir: Path, theme_id: str, manifest_thumb: Any) -> str:
    if isinstance(manifest_thumb, str) and manifest_thumb.strip():
        val = manifest_thumb.strip()
        if val.startswith(("radial-gradient", "linear-gradient", "#")):
            return val
        rel = val.lstrip("/")
        cand = (theme_dir / rel).resolve()
        try:
            cand.relative_to(theme_dir.resolve())
            if cand.is_file():
                return f"url(__custom/{theme_id}/{rel}) center / cover no-repeat"
        except ValueError:
            pass
    for name in ("thumb.webp", "thumb.png", "thumb.jpg", "preview.webp", "preview.png", "preview.jpg"):
        if (theme_dir / name).is_file():
            return f"url(__custom/{theme_id}/{name}) center / cover no-repeat"
    return (
        "radial-gradient(circle at 28% 35%, rgba(120,210,255,0.45) 0%, transparent 45%), "
        "radial-gradient(circle at 75% 70%, rgba(180,120,255,0.38) 0%, transparent 48%), "
        "linear-gradient(145deg, #1b2738 0%, #243b55 55%, #16222f 100%)"
    )


def _media_wrapper_html(media_filename: str, is_video: bool, title: str) -> str:
    safe_title = html.escape(title)
    safe_media = html.escape(media_filename)
    tag = (
        f'<video id="media" src="{safe_media}" autoplay loop muted playsinline></video>'
        if is_video
        else f'<img id="media" src="{safe_media}" alt="{safe_title}">'
    )
    speed_block = (
        "  if (!isVideo) return;\n"
        "  media.playbackRate = Math.max(0.25, Math.min(2.0, P.speed || 1));\n"
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{safe_title}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ width: 100%; height: 100%; overflow: hidden; background: #0d1117; }}
  #stage {{ position: fixed; inset: 0; overflow: hidden; }}
  #media {{
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
    transform-origin: center center; will-change: transform, filter;
  }}
  #halo {{
    position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none;
  }}
  #ghosts {{ position: fixed; inset: 0; pointer-events: none; display: none; }}
  body.preview #ghosts {{ display: block; }}
  .ghost {{
    position: absolute; display: flex; flex-direction: column; align-items: center;
    padding-top: 6px; opacity: .28;
  }}
  .ghost i {{ width: 40px; height: 40px; border-radius: 9px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); }}
  .ghost b {{ width: 46px; height: 6px; margin-top: 8px; border-radius: 3px; background: #fff; }}
</style>
</head>
<body>
<div id="stage">{tag}</div>
<canvas id="halo"></canvas>
<script>
'use strict';
const QS = new URLSearchParams(location.search);
const WALL = QS.has('wallpaper');
const PREVIEW = QS.has('preview');
const isVideo = {'true' if is_video else 'false'};
const P = {{ brightness: 1, dimIcons: 0.28, {'speed: 1' if is_video else 'motion: 0.35'}, adaptive: 1 }};
const DEFAULTS = Object.assign({{}}, P);
const media = document.getElementById('media');
const haloCv = document.getElementById('halo');
const haloCtx = haloCv.getContext('2d');
let icons = [];
let paused = false;
let t0 = performance.now();

function resize() {{
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  haloCv.width = Math.max(1, Math.round(innerWidth * dpr));
  haloCv.height = Math.max(1, Math.round(innerHeight * dpr));
  haloCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawHalo();
}}

function drawHalo() {{
  haloCtx.clearRect(0, 0, innerWidth, innerHeight);
  if (!P.adaptive || P.dimIcons <= 0.01 || !icons.length) return;
  const a = Math.min(0.75, Math.max(0, P.dimIcons)) * 0.65;
  for (const ic of icons) {{
    const cx = ic.x + ic.w * 0.5, cy = ic.y + ic.h * 0.5;
    const rad = Math.max(ic.w, ic.h) * 0.9;
    const g = haloCtx.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
    g.addColorStop(0, 'rgba(8, 12, 18, ' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(8, 12, 18, 0)');
    haloCtx.fillStyle = g;
    haloCtx.beginPath();
    haloCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    haloCtx.fill();
  }}
}}

function syncVisuals(now) {{
  const b = Math.max(0.35, Math.min(1.5, P.brightness || 1));
  media.style.filter = 'brightness(' + b.toFixed(2) + ')';
  if (isVideo) {{
{speed_block}
    media.style.transform = 'scale(1)';
  }} else {{
    const amt = Math.max(0, Math.min(1, P.motion || 0));
    if (amt <= 0.01) {{
      media.style.transform = 'scale(1)';
    }} else {{
      const s = (now - t0) * 0.00035;
      const sc = 1 + amt * (0.04 + 0.03 * (0.5 + 0.5 * Math.sin(s)));
      const dx = Math.sin(s * 0.7) * amt * 10;
      const dy = Math.cos(s * 0.53) * amt * 7;
      media.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
    }}
  }}
}}

function tick(now) {{
  if (!paused) syncVisuals(now);
  requestAnimationFrame(tick);
}}

function applySettings(v) {{
  for (const k in v) {{
    if (k in P && typeof v[k] === 'number') P[k] = v[k];
  }}
  syncVisuals(performance.now());
  drawHalo();
}}

function drawGhosts() {{
  const box = document.getElementById('ghosts');
  if (!box) return;
  box.innerHTML = icons.map(ic => '<div class="ghost" style="left:' + ic.x + 'px;top:' + ic.y + 'px;width:' + ic.w + 'px;height:' + ic.h + 'px"><i></i><b></b></div>').join('');
}}

function handleMsg(m) {{
  if (!m) return;
  if (m.t === 'pause') {{
    paused = PREVIEW ? false : !!m.v;
    if (isVideo) {{
      if (paused) media.pause(); else media.play().catch(() => {{}});
    }}
    return;
  }}
  if (m.t === 'settings') {{ applySettings(m.v || {{}}); return; }}
  if (m.t === 'reset') {{ applySettings(Object.assign({{}}, DEFAULTS, m.v || {{}})); return; }}
  if (m.t === 'icons') {{
    const k = window.devicePixelRatio || 1;
    icons = m.vis ? (m.r || []).map(([l, t, r, b]) => ({{ x: l / k, y: t / k, w: (r - l) / k, h: (b - t) / k }})) : [];
    if (PREVIEW) drawGhosts();
    drawHalo();
  }}
}}

if (PREVIEW) {{
  document.body.classList.add('preview');
  const g = document.createElement('div');
  g.id = 'ghosts';
  document.body.appendChild(g);
  addEventListener('message', ev => {{
    if (ev.source === parent) handleMsg(typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data);
  }});
  parent.postMessage(JSON.stringify({{ t: 'ready' }}), '*');
}} else if (WALL && window.chrome && window.chrome.webview) {{
  window.chrome.webview.addEventListener('message', ev => handleMsg(JSON.parse(ev.data)));
  window.chrome.webview.postMessage('ready');
}}

window.desklandSnapshot = function () {{
  const cw = Math.max(320, innerWidth), ch = Math.max(180, innerHeight);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, cw, ch);
  try {{
    const mw = isVideo ? (media.videoWidth || cw) : (media.naturalWidth || cw);
    const mh = isVideo ? (media.videoHeight || ch) : (media.naturalHeight || ch);
    const sc = Math.max(cw / mw, ch / mh);
    const dw = mw * sc, dh = mh * sc;
    ctx.drawImage(media, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }} catch (_) {{}}
  ctx.drawImage(haloCv, 0, 0, cw, ch);
  const tw = 760, th = Math.round(tw * ch / cw);
  const tc = document.createElement('canvas');
  tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(c, 0, 0, tw, th);
  return {{ canvas: c, thumb: tc.toDataURL('image/jpeg', 0.88) }};
}};

addEventListener('resize', resize);
resize();
requestAnimationFrame(tick);
</script>
</body>
</html>
"""


def _media_params(is_video: bool) -> list[dict[str, Any]]:
    second = (
        {
            "key": "speed",
            "label": "Playback speed",
            "hint": "Speed multiplier for animated video playback",
            "min": 0.25,
            "max": 2.0,
            "step": 0.05,
            "default": 1,
            "format": "times",
        }
        if is_video
        else {
            "key": "motion",
            "label": "Gentle drift",
            "hint": "Slow ambient zoom and drift across the wallpaper",
            "min": 0,
            "max": 1,
            "step": 0.01,
            "default": 0.35,
            "format": "percent",
        }
    )
    return [
        {
            "name": "Appearance",
            "params": [
                {
                    "key": "brightness",
                    "label": "Brightness",
                    "hint": "Overall brightness of the imported wallpaper",
                    "min": 0.4,
                    "max": 1.4,
                    "step": 0.01,
                    "default": 1,
                    "format": "percent",
                },
                second,
                {
                    "key": "dimIcons",
                    "label": "Icon halo",
                    "hint": "Soft dark backdrop behind desktop icons for legibility",
                    "min": 0,
                    "max": 1,
                    "step": 0.01,
                    "default": 0.28,
                    "format": "percent",
                },
            ],
        }
    ]


def import_theme_file(
    source: Path,
    custom_dir: Path | None = None,
    reserved_ids: set[str] | None = None,
) -> dict[str, Any]:
    """Import a theme package, HTML page, image, or video into custom_dir."""
    src = Path(source)
    if not src.is_file():
        raise ValueError(f"Selected file does not exist: {src}")
    if src.stat().st_size == 0:
        raise ValueError("Selected file is empty.")
    ext = src.suffix.lower()
    if ext not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported file type: {ext or 'none'}")

    target_root = custom_dir or custom_themes_dir()
    target_root.mkdir(parents=True, exist_ok=True)
    current = load_custom_themes(target_root)
    taken = set(reserved_ids or set()) | {str(t.get("id")) for t in current if t.get("id")}

    theme_id = _unique_id(_slugify(src.stem), taken, target_root)
    theme_dir = target_root / theme_id
    theme_dir.mkdir(parents=True, exist_ok=True)

    try:
        if ext in ARCHIVE_EXTS:
            try:
                zf_ctx = zipfile.ZipFile(src, "r")
            except zipfile.BadZipFile as exc:
                raise ValueError("Archive is corrupted or not a valid ZIP file.") from exc
            with zf_ctx as zf:
                entries = _safe_zip_members(zf)
                remaining = MAX_ARCHIVE_BYTES
                for info, parts in entries:
                    dest = (theme_dir / Path(*parts)).resolve()
                    dest.relative_to(theme_dir.resolve())
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info, "r") as zin, dest.open("wb") as zout:
                        remaining -= _copy_limited(zin, zout, remaining)
            manifest: dict[str, Any] = {}
            for mname in ("manifest.json", "theme.json"):
                mp = theme_dir / mname
                if mp.is_file():
                    try:
                        parsed = json.loads(mp.read_text(encoding="utf-8"))
                    except (OSError, ValueError) as exc:
                        raise ValueError(f"Invalid {mname} in theme archive.") from exc
                    if not isinstance(parsed, dict):
                        raise ValueError(f"Invalid {mname} structure (expected JSON object).")
                    manifest = parsed
                    break
            entry = _find_entry_html(theme_dir, manifest.get("entry") or manifest.get("page"))
            entry_html = _validate_html_file(theme_dir / entry)
            html_title = _extract_html_title(entry_html, _pretty_title(src.stem))
            theme_obj: dict[str, Any] = {
                "id": theme_id,
                "name": str(manifest.get("name") or html_title)[:60],
                "desc": str(manifest.get("desc") or "Imported custom theme package."),
                "page": f"__custom/{theme_id}/{entry}",
                "entry": entry,
                "status": "ready",
                "product": "free",
                "imported": True,
                "adaptive": bool(manifest.get("adaptive", False)),
                "thumb": _find_archive_thumb(theme_dir, theme_id, manifest.get("thumb")),
            }
            groups = _sanitize_groups(manifest.get("groups"))
            if groups:
                theme_obj["groups"] = groups

        elif ext in HTML_EXTS:
            raw_html = _validate_html_file(src)
            (theme_dir / "index.html").write_text(raw_html, encoding="utf-8")
            title = _extract_html_title(raw_html, _pretty_title(src.stem))
            theme_obj = {
                "id": theme_id,
                "name": title,
                "desc": "Imported interactive HTML wallpaper.",
                "page": f"__custom/{theme_id}/index.html",
                "entry": "index.html",
                "status": "ready",
                "product": "free",
                "imported": True,
                "adaptive": False,
                "thumb": (
                    "radial-gradient(circle at 30% 35%, rgba(98,195,255,0.45) 0%, transparent 48%), "
                    "radial-gradient(circle at 75% 70%, rgba(120,235,190,0.35) 0%, transparent 45%), "
                    "linear-gradient(150deg, #162231 0%, #243e54 55%, #172738 100%)"
                ),
            }

        else:
            is_video = ext in VIDEO_EXTS
            media_name = f"media{ext}"
            shutil.copy2(src, theme_dir / media_name)
            title = _pretty_title(src.stem)
            (theme_dir / "index.html").write_text(
                _media_wrapper_html(media_name, is_video, title),
                encoding="utf-8",
            )
            thumb = (
                "radial-gradient(circle at 32% 38%, rgba(255,170,95,0.45) 0%, transparent 48%), "
                "linear-gradient(150deg, #1e2130 0%, #342f48 55%, #1b1d29 100%)"
                if is_video
                else f"url(__custom/{theme_id}/{media_name}) center / cover no-repeat"
            )
            theme_obj = {
                "id": theme_id,
                "name": title,
                "desc": "Imported animated video wallpaper." if is_video else "Imported custom image wallpaper.",
                "page": f"__custom/{theme_id}/index.html",
                "entry": "index.html",
                "status": "ready",
                "product": "free",
                "imported": True,
                "adaptive": True,
                "thumb": thumb,
                "groups": _media_params(is_video),
            }

        current.append(theme_obj)
        save_custom_themes(target_root, current)
        return theme_obj
    except Exception:
        shutil.rmtree(theme_dir, ignore_errors=True)
        raise


def remove_custom_theme(theme_id: str, custom_dir: Path | None = None) -> bool:
    """Remove an imported custom theme from registry and disk."""
    target_root = custom_dir or custom_themes_dir()
    current = load_custom_themes(target_root)
    kept = [t for t in current if t.get("id") != theme_id]
    if len(kept) == len(current):
        return False
    save_custom_themes(target_root, kept)
    theme_dir = (target_root / Path(theme_id).name).resolve()
    try:
        theme_dir.relative_to(target_root.resolve())
        if theme_dir.is_dir():
            shutil.rmtree(theme_dir, ignore_errors=True)
    except ValueError:
        pass
    return True
