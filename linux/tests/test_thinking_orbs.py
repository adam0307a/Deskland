"""Tests for the ThinkingOrbs theme schema, translations, Plasma bridge, and X11 hover."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

from deskland_linux import wallpaper as wallpaper_mod
from deskland_linux.config import Log, ThemeRegistry
from deskland_linux.wallpaper import Wallpaper

REPO_ROOT = Path(__file__).resolve().parents[2]
PROTO = REPO_ROOT / "prototype"


def test_thinking_orbs_registry_and_assets_exist(tmp_path: Path) -> None:
    themes_data = json.loads((PROTO / "themes.json").read_text(encoding="utf-8"))
    by_id = {t["id"]: t for t in themes_data["themes"]}
    assert "thinking-orbs" in by_id

    theme = by_id["thinking-orbs"]
    assert theme["status"] == "ready"
    assert theme["product"] == "free"
    assert theme["adaptive"] is True
    assert theme["page"] == "thinking-orbs.html"
    assert theme["credit"] == {
        "prefix": "Thanks to",
        "label": "https://github.com/haplollc",
        "url": "https://github.com/haplollc",
    }
    assert (PROTO / theme["page"]).is_file()
    assert (PROTO / "thinking-orbs-engine.js").is_file()
    assert (PROTO / "thumbs" / "thinking-orbs.webp").is_file()

    params = {p["key"]: p for g in theme["groups"] for p in g["params"]}
    assert params["orbDesign"]["values"] == [
        "working",
        "searching",
        "solving",
        "listening",
        "connecting",
        "weaving",
        "composing",
        "breathing",
        "shaping",
    ]
    assert len(params["orbDesign"]["options"]) == 9
    assert params["orbDesign"]["default"] == "searching"
    assert params["palette"]["values"] == [
        "monochrome-dark",
        "monochrome-light",
        "cobalt",
        "amber",
        "emerald",
    ]

    reg = ThemeRegistry(PROTO, Log(tmp_path / "dummy.log"))
    assert reg.allowed("thinking-orbs") is True
    assert reg.page_for("thinking-orbs") == "thinking-orbs.html"


def test_thinking_orbs_i18n_parity() -> None:
    themes_data = json.loads((PROTO / "themes.json").read_text(encoding="utf-8"))
    theme = next(t for t in themes_data["themes"] if t["id"] == "thinking-orbs")
    base_params = {p["key"]: p for g in theme["groups"] for p in g["params"]}

    for lang_code in ("en", "tr"):
        i18n_data = json.loads((PROTO / "i18n" / f"{lang_code}.json").read_text(encoding="utf-8"))
        entry = i18n_data["themes"]["thinking-orbs"]
        assert entry["name"]
        assert entry["desc"]
        assert len(entry["groups"]) == len(theme["groups"])
        for key, param in base_params.items():
            assert key in entry["params"], f"{key} missing in {lang_code}"
            assert entry["params"][key]["label"]
            if "options" in param:
                assert len(entry["params"][key]["options"]) == len(param["options"])


def test_plasma_inject_registers_thinking_orbs_and_hover() -> None:
    inject_js = (
        REPO_ROOT
        / "linux"
        / "plasma-wallpaper"
        / "org.deskland.preview"
        / "contents"
        / "ui"
        / "inject.js"
    ).read_text(encoding="utf-8")
    assert "'thinking-orbs': 'thinking-orbs.html'" in inject_js
    assert "kind === 'hover'" in inject_js
    assert "kind === 'leave'" in inject_js


def test_x11_pointer_occlusion_and_forwarding(monkeypatch) -> None:
    desktop_hint = wallpaper_mod.Gdk.WindowTypeHint.DESKTOP
    normal_hint = wallpaper_mod.Gdk.WindowTypeHint.NORMAL
    iconified = wallpaper_mod.Gdk.WindowState.ICONIFIED

    fake_windows = [
        SimpleNamespace(
            is_visible=lambda: True,
            get_state=lambda: 0,
            get_type_hint=lambda: desktop_hint,
            get_geometry=lambda: (0, 0, 1920, 1080),
        ),
        SimpleNamespace(
            is_visible=lambda: True,
            get_state=lambda: iconified,
            get_type_hint=lambda: normal_hint,
            get_geometry=lambda: (400, 300, 600, 400),
        ),
        SimpleNamespace(
            is_visible=lambda: True,
            get_state=lambda: 0,
            get_type_hint=lambda: normal_hint,
            get_geometry=lambda: (500, 400, 300, 200),
        ),
    ]
    fake_screen = SimpleNamespace(get_window_stack=lambda: fake_windows)

    # Inside minimized or desktop window -> desktop is visible; inside visible normal window -> occluded
    assert Wallpaper._is_x11_point_over_desktop(fake_screen, 200, 200) is True
    assert Wallpaper._is_x11_point_over_desktop(fake_screen, 450, 350) is True
    assert Wallpaper._is_x11_point_over_desktop(fake_screen, 600, 500) is False

    wp = Wallpaper.__new__(Wallpaper)
    wp._closed = False
    wp.backend = "x11"
    wp._ready = True
    wp._last_pause = 0
    wp.geo = SimpleNamespace(x=0, y=0, width=1920, height=1080)
    wp.bridge = MagicMock()
    wp._pointer_active = False
    wp._last_pointer = None
    wp._pointer_timeout = 0

    pos = {"x": 240, "y": 320}
    fake_pointer = SimpleNamespace(get_position=lambda: (fake_screen, pos["x"], pos["y"]))
    fake_seat = SimpleNamespace(get_pointer=lambda: fake_pointer)
    fake_display = SimpleNamespace(get_default_seat=lambda: fake_seat)
    monkeypatch.setattr(wallpaper_mod.Gdk.Display, "get_default", staticmethod(lambda: fake_display))

    assert wp._poll_x11_pointer() is True
    wp.bridge.post.assert_called_once_with({"t": "pointer", "kind": "hover", "x": 240, "y": 320})

    # Moving onto an occluding normal window emits leave once
    wp.bridge.reset_mock()
    pos["x"], pos["y"] = 600, 500
    assert wp._poll_x11_pointer() is True
    wp.bridge.post.assert_called_once_with({"t": "pointer", "kind": "leave"})
    assert wp._pointer_active is False

    # Subsequent occluded ticks do not spam leave
    wp.bridge.reset_mock()
    assert wp._poll_x11_pointer() is True
    wp.bridge.post.assert_not_called()


def test_settings_window_opens_external_credit_links_via_xdg_open(monkeypatch) -> None:
    from deskland_linux import settings_window as sw_mod

    fake_bridge = MagicMock()
    fake_bridge.webview = MagicMock()
    fake_gtk_win = MagicMock()
    monkeypatch.setattr(sw_mod, "BridgeWebView", lambda _cb: fake_bridge)
    monkeypatch.setattr(sw_mod.Gtk, "Window", lambda **_kw: fake_gtk_win)

    opened = []
    monkeypatch.setattr(sw_mod.subprocess, "Popen", lambda cmd, **_kw: opened.append(cmd))

    host = SimpleNamespace(on_settings_message=lambda _m: None)
    sw = sw_mod.SettingsWindow(host, "http://127.0.0.1:9999/settings.html")

    decision = MagicMock()
    decision.get_navigation_action.return_value = SimpleNamespace(
        get_request=lambda: SimpleNamespace(get_uri=lambda: "https://github.com/haplollc")
    )
    handled = sw._on_decide_policy(
        fake_bridge.webview,
        decision,
        sw_mod.WebKit2.PolicyDecisionType.NEW_WINDOW_ACTION,
    )
    assert handled is True
    decision.ignore.assert_called_once()
    assert opened == [["xdg-open", "https://github.com/haplollc"]]
