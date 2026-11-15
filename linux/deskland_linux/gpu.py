"""Single-GPU EGL vendor selection to avoid dual-driver stalls on hybrid laptops."""

from __future__ import annotations

import os
from collections.abc import MutableMapping
from pathlib import Path

_MESA_VENDORS = {"0x1002", "0x8086"}
_NVIDIA_VENDOR = "0x10de"


def _find_vendor_json(egl_dir: Path, needle: str) -> Path | None:
    if not egl_dir.is_dir():
        return None
    for path in sorted(egl_dir.glob("*.json")):
        if needle in path.name.lower():
            return path
    return None


def _connected_gpu_vendors(drm_root: Path) -> set[str]:
    vendors: set[str] = set()
    if not drm_root.is_dir():
        return vendors
    for status_file in sorted(drm_root.glob("card*-*/status")):
        try:
            if status_file.read_text(encoding="utf-8", errors="ignore").strip() != "connected":
                continue
        except OSError:
            continue
        card_name = status_file.parent.name.split("-", 1)[0]
        vendor_file = drm_root / card_name / "device" / "vendor"
        try:
            vendor = vendor_file.read_text(encoding="utf-8", errors="ignore").strip().lower()
        except OSError:
            continue
        if vendor:
            vendors.add(vendor)
    return vendors


def select_single_egl_vendor(
    environ: MutableMapping[str, str] | None = None,
    drm_root: Path = Path("/sys/class/drm"),
    egl_dir: Path = Path("/usr/share/glvnd/egl_vendor.d"),
) -> str | None:
    """Return an explicit EGL vendor JSON path on hybrid GPU systems, or None."""
    env = os.environ if environ is None else environ
    if env.get("__EGL_VENDOR_LIBRARY_FILENAMES") or env.get("DESKLAND_DISABLE_GPU_LOCK"):
        return None

    nvidia_json = _find_vendor_json(egl_dir, "nvidia")
    mesa_json = _find_vendor_json(egl_dir, "mesa")
    if not nvidia_json or not mesa_json:
        return None

    connected = _connected_gpu_vendors(drm_root)
    if not connected:
        return None

    if connected <= _MESA_VENDORS:
        return str(mesa_json)
    if connected == {_NVIDIA_VENDOR}:
        return str(nvidia_json)
    return None


def configure_single_gpu_env(environ: MutableMapping[str, str] | None = None) -> str | None:
    """Set ``__EGL_VENDOR_LIBRARY_FILENAMES`` before GTK/WebKit initializes EGL."""
    env = os.environ if environ is None else environ
    chosen = select_single_egl_vendor(environ=env)
    if chosen:
        env["__EGL_VENDOR_LIBRARY_FILENAMES"] = chosen
    return chosen
