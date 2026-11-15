"""Native settings window hosting prototype/settings.html in WebKitGTK."""

from __future__ import annotations

from typing import Any

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")

from gi.repository import Gdk, Gtk  # noqa: E402

from .bridge import BridgeWebView  # noqa: E402


class SettingsWindow:
    def __init__(self, host: Any, url: str) -> None:
        self.host = host
        self.url = url
        self.bridge = BridgeWebView(self.host.on_settings_message)
        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_title("DiyarDesk")
        self.window.set_default_size(1120, 800)
        self.window.set_size_request(940, 680)
        self.window.set_position(Gtk.WindowPosition.CENTER)
        self.window.add(self.bridge.webview)
        self.window.connect("delete-event", self._on_delete)
        self.window.connect("window-state-event", self._on_window_state)
        self._loaded = False

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        self._loaded = True
        self.bridge.load_uri(self.url)

    def _unload(self) -> None:
        if not self._loaded:
            return
        self._loaded = False
        try:
            self.bridge.load_uri("about:blank")
        except Exception:
            pass

    def _on_window_state(self, _window, event) -> bool:
        iconified_mask = Gdk.WindowState.ICONIFIED
        if (event.changed_mask & iconified_mask) == 0:
            return False
        if event.new_window_state & iconified_mask:
            self._unload()
        elif self.window.get_visible():
            self._ensure_loaded()
        return False

    def _on_delete(self, _window, _event) -> bool:
        self.hide()
        return True

    def show(self) -> None:
        self._ensure_loaded()
        self.window.show_all()
        self.window.present()

    def hide(self) -> None:
        self.window.hide()
        self._unload()

    def post(self, payload: Any) -> None:
        if not self._loaded:
            return
        self.bridge.post(payload)

    def destroy(self) -> None:
        try:
            self.window.destroy()
        except Exception:
            pass
