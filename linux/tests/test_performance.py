"""Tests for resource-saving optimizations on Linux/KDE Plasma."""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import MagicMock

from deskland_linux import settings_window as settings_window_mod
from deskland_linux import wallpaper as wallpaper_mod
from deskland_linux.settings_window import SettingsWindow
from deskland_linux.wallpaper import Wallpaper, plasma_pause_path


def test_settings_window_unloads_webview_when_hidden(monkeypatch) -> None:
    fake_bridge = MagicMock()
    fake_bridge.webview = MagicMock()
    fake_gtk_win = MagicMock()

    monkeypatch.setattr(settings_window_mod, "BridgeWebView", lambda _cb: fake_bridge)
    monkeypatch.setattr(settings_window_mod.Gtk, "Window", lambda **_kw: fake_gtk_win)

    host = SimpleNamespace(on_settings_message=lambda _msg: None)
    sw = SettingsWindow(host, "http://127.0.0.1:9999/settings.html")

    # Opening loads URL; posting while visible forwards messages.
    sw.show()
    fake_bridge.load_uri.assert_called_once_with("http://127.0.0.1:9999/settings.html")
    sw.post({"t": "icons"})
    fake_bridge.post.assert_called_once_with({"t": "icons"})

    # Closing window unloads WebView to about:blank and drops background posts.
    fake_bridge.reset_mock()
    assert sw._on_delete(fake_gtk_win, None) is True
    fake_gtk_win.hide.assert_called_once()
    fake_bridge.load_uri.assert_called_once_with("about:blank")
    sw.post({"t": "icons"})
    fake_bridge.post.assert_not_called()

    # Re-opening reloads settings URL cleanly.
    fake_bridge.reset_mock()
    sw.show()
    fake_bridge.load_uri.assert_called_once_with("http://127.0.0.1:9999/settings.html")

    # Minimizing unloads to about:blank; un-minimizing reloads when visible.
    fake_bridge.reset_mock()
    fake_gtk_win.get_visible.return_value = True
    iconified = settings_window_mod.Gdk.WindowState.ICONIFIED
    sw._on_window_state(fake_gtk_win, SimpleNamespace(changed_mask=iconified, new_window_state=iconified))
    fake_bridge.load_uri.assert_called_once_with("about:blank")

    fake_bridge.reset_mock()
    sw._on_window_state(fake_gtk_win, SimpleNamespace(changed_mask=iconified, new_window_state=0))
    fake_bridge.load_uri.assert_called_once_with("http://127.0.0.1:9999/settings.html")


def test_select_single_egl_vendor_hybrid_laptop(tmp_path) -> None:
    from deskland_linux.gpu import select_single_egl_vendor

    egl = tmp_path / "egl"
    egl.mkdir()
    (egl / "10_nvidia.json").write_text("{}", encoding="utf-8")
    (egl / "50_mesa.json").write_text("{}", encoding="utf-8")

    drm = tmp_path / "drm"
    (drm / "card1" / "device").mkdir(parents=True)
    (drm / "card1" / "device" / "vendor").write_text("0x10de\n", encoding="utf-8")
    (drm / "card1-HDMI-A-1").mkdir(parents=True)
    (drm / "card1-HDMI-A-1" / "status").write_text("disconnected\n", encoding="utf-8")

    (drm / "card2" / "device").mkdir(parents=True)
    (drm / "card2" / "device" / "vendor").write_text("0x1002\n", encoding="utf-8")
    (drm / "card2-eDP-1").mkdir(parents=True)
    (drm / "card2-eDP-1" / "status").write_text("connected\n", encoding="utf-8")

    # Only AMD eDP panel connected -> locks EGL to Mesa to prevent dual EGL loading.
    assert select_single_egl_vendor({}, drm_root=drm, egl_dir=egl) == str(egl / "50_mesa.json")

    # Respects explicit user override.
    assert select_single_egl_vendor({"__EGL_VENDOR_LIBRARY_FILENAMES": "/custom.json"}, drm_root=drm, egl_dir=egl) is None

    # External NVIDIA monitor connected alongside eDP -> do not force single vendor.
    (drm / "card1-HDMI-A-1" / "status").write_text("connected\n", encoding="utf-8")
    assert select_single_egl_vendor({}, drm_root=drm, egl_dir=egl) is None

    # Only NVIDIA output connected -> locks EGL to NVIDIA.
    (drm / "card2-eDP-1" / "status").write_text("disconnected\n", encoding="utf-8")
    assert select_single_egl_vendor({}, drm_root=drm, egl_dir=egl) == str(egl / "10_nvidia.json")


def _make_fake_plasma_wallpaper() -> Wallpaper:
    wp = Wallpaper.__new__(Wallpaper)
    wp.host = SimpleNamespace(
        i18n=SimpleNamespace(t=lambda k: k),
        settings=SimpleNamespace(
            virtual_icons=[], virtual_bar_collapsed=False, virtual_bar_mode="auto"
        ),
        wallpaper_settings_message=lambda: {"t": "settings", "theme": "zen-archipelago", "params": {}},
    )
    wp.log = MagicMock()
    wp.backend = "plasma-plugin"
    wp._page = "zen-archipelago.html"
    wp._closed = False
    wp._ready = False
    wp._manual_pause = False
    wp._last_pause = -1
    wp._last_icons = '{"t":"icons","vis":true,"r":[[0,0,10,10]]}'
    wp._ui_rect = None
    wp._snapshot_done = None
    wp._snapshot_timeout = 0
    wp._pending_snapshot = False
    wp._record_done = None
    wp._record_timeout = 0
    wp._pending_record = False
    wp._pause_busy = False
    wp._native_audio = MagicMock()
    wp.static_wallpaper = MagicMock()
    wp._static_timeout = 0
    wp._static_file = None
    wp.bridge = None
    wp.web = None
    wp.window = None
    wp._apply_input_region = MagicMock()
    wp._sync_native_audio = MagicMock()
    wp._poll_pause_once = MagicMock()
    return wp


def test_plasma_pause_state_file_and_lazy_page_load(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    wp = _make_fake_plasma_wallpaper()

    # Without an active share renderer, load_page / set_settings are cheap state updates.
    wp.load_page("istanbul.html")
    assert wp._page == "istanbul.html"
    assert wp.bridge is None
    wp.set_settings({"speed": 1.2})

    # Toggling manual pause writes ~/.cache/deskland/pause.json cleanly.
    wp.set_manual_pause(True)
    data = json.loads(plasma_pause_path().read_text(encoding="utf-8"))
    assert data["paused"] is True

    wp.set_manual_pause(False)
    data = json.loads(plasma_pause_path().read_text(encoding="utf-8"))
    assert data["paused"] is False

    wp.shutdown()
    data = json.loads(plasma_pause_path().read_text(encoding="utf-8"))
    assert data["paused"] is False


def test_plasma_lazy_share_renderer_lifecycle(monkeypatch) -> None:
    wp = _make_fake_plasma_wallpaper()
    fake_bridge = MagicMock()
    fake_window = MagicMock()

    monkeypatch.setattr(wallpaper_mod.GLib, "timeout_add_seconds", lambda _s, _cb: 42)
    monkeypatch.setattr(wallpaper_mod.GLib, "source_remove", lambda _id: None)
    monkeypatch.setattr(wallpaper_mod.GLib, "idle_add", lambda cb, *args: (cb(*args), 1)[1])

    def fake_ensure() -> None:
        wp.bridge = fake_bridge
        wp.web = MagicMock()
        wp.window = fake_window

    wp._ensure_share_renderer = fake_ensure  # type: ignore[method-assign]

    results: list[tuple[str | None, str | None, str | None]] = []
    wp.request_snapshot(lambda thumb, png, err: results.append((thumb, png, err)))
    assert wp.bridge is fake_bridge
    assert wp._pending_snapshot is True

    # Once WebView signals ready, snapshot runs and receives cached icons immediately.
    wp._on_ready()
    fake_bridge.post.assert_any_call(wp._last_icons)
    fake_bridge.post.assert_any_call({"t": "snapshot"})

    # Finishing snapshot invokes callback and destroys temporary renderer.
    wp._on_snapshot("snapshot|thumbdata|pngdata")
    assert results == [("thumbdata", "pngdata", None)]
    fake_window.destroy.assert_called_once()
    assert wp.bridge is None
    assert wp.window is None


def test_app_save_snapshot_skips_slow_wallpaper_renderer(tmp_path, monkeypatch) -> None:
    from deskland_linux import app as app_mod

    saved: list[tuple[str, str]] = []
    copied: list[object] = []
    posted: list[dict[str, object]] = []

    monkeypatch.setattr(app_mod, "pictures_dir", lambda: tmp_path)
    monkeypatch.setattr(
        app_mod,
        "save_share",
        lambda data, dest, kind, _mime="": (saved.append((data, kind)), dest / "snap.png")[1],
    )
    monkeypatch.setattr(app_mod, "copy_image", lambda p: copied.append(p))

    host = app_mod.DesklandHost.__new__(app_mod.DesklandHost)
    host.log = MagicMock()
    host.wallpaper = MagicMock()
    host.i18n = SimpleNamespace(t=lambda k: k)
    host._post_settings = lambda payload: posted.append(payload)  # type: ignore[method-assign]

    host.on_settings_message(
        json.dumps({"t": "saveSnapshot", "thumb": "data:thumb", "png": "data:png"})
    )

    host.wallpaper.request_snapshot.assert_not_called()
    assert saved == [("data:png", "image")]
    assert len(copied) == 1
    assert posted[0]["ok"] is True
    assert posted[0]["thumb"] == "data:thumb"

