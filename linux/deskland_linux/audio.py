"""Native looped audio playback fallback when WebKitGTK lacks autoaudiosink."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any


def resolve_theme_audio_path(
    theme_meta: dict[str, Any] | None,
    params: dict[str, Any] | None,
    audio_dir: Path | None,
    prototype_dir: Path,
) -> Path | None:
    """Resolve the active local audio file for a theme if it defines an audio control."""
    if not isinstance(theme_meta, dict):
        return None
    audio_ctrl: dict[str, Any] | None = None
    for group in theme_meta.get("groups") or []:
        if not isinstance(group, dict):
            continue
        for param in group.get("params") or []:
            if isinstance(param, dict) and param.get("type") == "audio":
                audio_ctrl = param
                break
        if audio_ctrl is not None:
            break
    if audio_ctrl is None:
        return None

    custom_name = (params or {}).get("audioFile")
    if isinstance(custom_name, str) and custom_name and audio_dir is not None:
        try:
            base = audio_dir.resolve()
            candidate = (base / Path(custom_name).name).resolve()
            candidate.relative_to(base)
            if candidate.is_file():
                return candidate
        except OSError:
            pass
        except ValueError:
            pass

    default_src = audio_ctrl.get("defaultSrc")
    if isinstance(default_src, str) and default_src:
        try:
            proto_base = prototype_dir.resolve()
            candidate = (proto_base / default_src).resolve()
            candidate.relative_to(proto_base)
            if candidate.is_file():
                return candidate
        except OSError:
            pass
        except ValueError:
            pass
    return None


def _player_command(path: Path) -> list[str] | None:
    """Pick an installed CLI player supporting gapless/infinite looped playback."""
    target = str(path)
    if mpv := shutil.which("mpv"):
        return [mpv, "--no-video", "--no-terminal", "--really-quiet", "--loop=inf", target]
    if ffplay := shutil.which("ffplay"):
        return [ffplay, "-nodisp", "-autoexit", "-loop", "0", "-loglevel", "quiet", target]
    if path.suffix.lower() == ".mp3" and (mpg123 := shutil.which("mpg123")):
        return [mpg123, "--loop", "-1", "-q", target]
    return None


class NativeAudioPlayer:
    """Manages an external looped audio subprocess on Linux hosts without WebKit audio."""

    def __init__(self, log: Any) -> None:
        self.log = log
        self._proc: subprocess.Popen[bytes] | None = None
        self._current_path: Path | None = None
        self._warned_missing = False

    def sync(self, play: bool, paused: bool, path: Path | None) -> None:
        want = bool(play and not paused and path is not None and path.is_file())
        if not want:
            self.stop()
            return
        assert path is not None
        if self._proc is not None and self._proc.poll() is None and self._current_path == path:
            return
        self.stop()
        cmd = _player_command(path)
        if cmd is None:
            if not self._warned_missing:
                self._warned_missing = True
                self.log.write("Ses oynatıcı bulunamadı (mpv, ffplay veya gst-plugins-good kurun)")
            return
        try:
            self._proc = subprocess.Popen(
                cmd,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self._current_path = path
        except OSError as exc:
            self._proc = None
            self._current_path = None
            self.log.write(f"Yerel ses başlatılamadı: {exc}")

    def stop(self) -> None:
        proc = self._proc
        self._proc = None
        self._current_path = None
        if proc is None:
            return
        if proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=1.5)
            except Exception:
                try:
                    proc.kill()
                    proc.wait(timeout=1.0)
                except Exception:
                    pass
