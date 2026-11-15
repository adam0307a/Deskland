import io
import json
import urllib.request
import zipfile
from pathlib import Path

from deskland_linux.config import Log, ThemeRegistry
from deskland_linux.importer import import_theme_file, load_custom_themes, remove_custom_theme
from deskland_linux.server import LocalServer


def test_import_html_and_remove(tmp_path: Path) -> None:
    custom_dir = tmp_path / "custom"
    src = tmp_path / "neon-grid.html"
    src.write_text("<!doctype html><html><head><title>Neon Grid</title></head><body>ok</body></html>", encoding="utf-8")

    theme = import_theme_file(src, custom_dir=custom_dir, reserved_ids={"meadow", "beach"})
    assert theme["id"] == "custom-neon-grid"
    assert theme["name"] == "Neon Grid"
    assert theme["imported"] is True
    assert theme["status"] == "ready"
    assert theme["product"] == "free"
    assert theme["page"] == "__custom/custom-neon-grid/index.html"
    assert (custom_dir / "custom-neon-grid" / "index.html").is_file()
    assert len(load_custom_themes(custom_dir)) == 1

    assert remove_custom_theme("custom-neon-grid", custom_dir=custom_dir) is True
    assert load_custom_themes(custom_dir) == []
    assert not (custom_dir / "custom-neon-grid").exists()


def test_import_zip_with_single_root_and_manifest(tmp_path: Path) -> None:
    custom_dir = tmp_path / "custom"
    pkg = tmp_path / "sunset-pack.deskland"
    with zipfile.ZipFile(pkg, "w") as zf:
        zf.writestr("sunset/manifest.json", json.dumps({"name": "Sunset Sky", "entry": "scene.html", "adaptive": True}))
        zf.writestr("sunset/scene.html", "<html><body><h1>Sunset</h1></body></html>")
        zf.writestr("sunset/thumb.png", b"\x89PNG\r\n\x1a\n")

    theme = import_theme_file(pkg, custom_dir=custom_dir, reserved_ids=set())
    assert theme["name"] == "Sunset Sky"
    assert theme["adaptive"] is True
    assert theme["entry"] == "scene.html"
    assert theme["page"] == "__custom/custom-sunset-pack/scene.html"
    assert "url(__custom/custom-sunset-pack/thumb.png)" in theme["thumb"]
    assert (custom_dir / theme["id"] / "scene.html").is_file()


def test_import_zip_rejects_traversal(tmp_path: Path) -> None:
    custom_dir = tmp_path / "custom"
    bad = tmp_path / "evil.zip"
    with zipfile.ZipFile(bad, "w") as zf:
        zf.writestr("../escape.html", "bad")

    try:
        import_theme_file(bad, custom_dir=custom_dir)
    except ValueError as exc:
        assert "Unsafe" in str(exc)
    else:
        raise AssertionError("Expected ValueError for path traversal")


def test_import_image_and_server_merge(tmp_path: Path) -> None:
    proto = tmp_path / "proto"
    proto.mkdir()
    (proto / "themes.json").write_text(
        json.dumps({"themes": [{"id": "beach", "name": "Beach", "status": "ready", "product": "free", "page": "flat.html"}]}),
        encoding="utf-8",
    )
    (proto / "share.js").write_text("// share", encoding="utf-8")

    custom_dir = tmp_path / "custom"
    img = tmp_path / "forest_photo.png"
    img.write_bytes(b"\x89PNG\r\n\x1a\nfake")

    theme = import_theme_file(img, custom_dir=custom_dir, reserved_ids={"beach"})
    assert theme["adaptive"] is True
    assert len(theme["groups"][0]["params"]) == 3
    assert (custom_dir / theme["id"] / "media.png").is_file()
    assert (custom_dir / theme["id"] / "index.html").is_file()

    reg = ThemeRegistry(proto, Log(tmp_path / "test.log"), custom_dir=custom_dir)
    assert reg.allowed(theme["id"]) is True
    assert reg.page_for(theme["id"]) == f"__custom/{theme['id']}/index.html"

    srv = LocalServer(
        proto,
        tmp_path / "share",
        custom_themes_dir=custom_dir,
        themes_provider=reg.merged_json_bytes,
    )
    port = srv.start()
    try:
        merged = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/themes.json").read().decode("utf-8"))
        ids = [t["id"] for t in merged["themes"]]
        assert ids == ["beach", theme["id"]]
        html_body = urllib.request.urlopen(f"http://127.0.0.1:{port}/{theme['page']}").read().decode("utf-8")
        assert "forest photo" in html_body
        assert "desklandSnapshot" in html_body
    finally:
        srv.stop()
