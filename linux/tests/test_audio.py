"""Tests for the Linux native audio fallback helpers."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from deskland_linux.audio import NativeAudioPlayer, resolve_theme_audio_path


def test_resolve_theme_audio_path_defaults_and_custom(tmp_path: Path) -> None:
    proto = tmp_path / "proto"
    (proto / "assets").mkdir(parents=True)
    default_mp3 = proto / "assets" / "roach-default.mp3"
    default_mp3.write_bytes(b"mp3")

    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    custom_mp3 = audio_dir / "roach_123.mp3"
    custom_mp3.write_bytes(b"custom")

    roach_meta = {
        "id": "roach",
        "groups": [{"params": [{"key": "audio", "type": "audio", "defaultSrc": "assets/roach-default.mp3"}]}],
    }
    rift_meta = {"id": "rift", "groups": [{"params": [{"key": "sigma", "type": "range"}]}]}

    assert resolve_theme_audio_path(rift_meta, {"audioFile": "roach_123.mp3"}, audio_dir, proto) is None
    assert resolve_theme_audio_path(roach_meta, {}, audio_dir, proto) == default_mp3.resolve()
    assert (
        resolve_theme_audio_path(roach_meta, {"audioFile": "roach_123.mp3"}, audio_dir, proto)
        == custom_mp3.resolve()
    )
    # Path traversal outside assets/audio must fall back safely or reject.
    assert (
        resolve_theme_audio_path(roach_meta, {"audioFile": "../outside.mp3"}, audio_dir, proto)
        == default_mp3.resolve()
    )


def test_native_audio_player_lifecycle(tmp_path: Path) -> None:
    track = tmp_path / "song.mp3"
    track.write_bytes(b"mp3")
    log = MagicMock()
    player = NativeAudioPlayer(log)

    proc = MagicMock()
    proc.poll.return_value = None

    with patch("deskland_linux.audio._player_command", return_value=["mpv", str(track)]), patch(
        "deskland_linux.audio.subprocess.Popen", return_value=proc
    ) as popen:
        player.sync(play=False, paused=False, path=track)
        assert popen.call_count == 0

        player.sync(play=True, paused=False, path=track)
        assert popen.call_count == 1

        # Re-syncing while already playing the same track should not respawn.
        player.sync(play=True, paused=False, path=track)
        assert popen.call_count == 1

        # Pausing terminates playback.
        player.sync(play=True, paused=True, path=track)
        proc.terminate.assert_called_once()
