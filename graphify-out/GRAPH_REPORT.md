# Graph Report - workspace  (2026-11-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1614 nodes · 3696 edges · 71 communities (44 shown, 27 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `50f0b082`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DesklandHost
- Native
- TabletWallpaperEngine
- icons.py
- with
- CustomThemeImporter
- wallpaper.py
- Wallpaper
- strike-props.js
- importer.py
- WallpaperForm
- Deskland Preview — Linux port
- roach-props.js
- IconOverlayService.kt
- HostContext
- CustomThemes
- DesktopHost.cs
- ThemeStore
- thinking-orbs-engine.js
- pocket-props.js
- SettingsWindow
- DiyarDesk
- rift-props.js
- rosebrook-blooms.js
- SettingsActivity
- config.py
- Log.Write
- SettingsActivity.kt
- test_wallpaper_insets.py
- app.py
- share.js
- NormalizedBox
- wall-icons.js
- steps
- DiyarDeskExtension
- BoundedReadStream
- SettingsForm
- steps
- glade-trees.js
- PauseMonitor
- test_performance.py
- InteractiveIconCanvasView.kt
- Tray
- autostart.py
- .__init__
- makeDesertAtlas
- meadow-boy.js
- StaticWallpaper
- AutoStartCheck
- Themes
- inject.js
- aurora-pines.js
- _Handler
- IconLayoutActivity
- beach-palms.js
- meadow-cat.js
- serve.mjs
- Deskland Windows 宿主
- low-mode.js
- ._is_x11_point_over_desktop
- build-deb.sh
- run.sh
- istanbul-city.js

## God Nodes (most connected - your core abstractions)
1. `Wallpaper` - 71 edges
2. `Native` - 60 edges
3. `WallpaperForm` - 56 edges
4. `DesklandHost` - 53 edges
5. `HostContext` - 49 edges
6. `ThemeStore` - 41 edges
7. `CustomThemeImporter` - 32 edges
8. `import_theme_file()` - 31 edges
9. `CustomThemes` - 27 edges
10. `IconReader` - 26 edges

## Surprising Connections (you probably didn't know these)
- `1. Project Overview` --references--> `DiyarWallpaperService`  [INFERRED]
  AGENTS.md → android/app/src/main/java/com/diyardesk/tablet/DiyarWallpaperService.kt
- `5. Custom Theme Importer (`linux/deskland_linux/importer.py`)` --references--> `remove_custom_theme()`  [INFERRED]
  AGENTS.md → linux/deskland_linux/importer.py
- `2. Repository Layout` --references--> `DesklandHost`  [INFERRED]
  AGENTS.md → linux/deskland_linux/app.py
- `2. Repository Layout` --references--> `SettingsStore`  [INFERRED]
  AGENTS.md → linux/deskland_linux/config.py
- `2. Repository Layout` --references--> `ThemeRegistry`  [INFERRED]
  AGENTS.md → linux/deskland_linux/config.py

## Import Cycles
- None detected.

## Communities (71 total, 27 thin omitted)

### Community 0 - "DesklandHost"
Cohesion: 0.05
Nodes (31): 2. Repository Layout, 3. Themes & Prototype Rules, 4. Host ↔ Prototype Message Contract, 5. Custom Theme Importer (`linux/deskland_linux/importer.py`), 6. Linux Architecture & KDE Plasma Notes, 7. Build, Preview, Test & Verification Commands, 8. Product Identity, Security & Licensing Guardrails, Android Tablet Build & Unit Tests (+23 more)

### Community 1 - "Native"
Cohesion: 0.06
Nodes (13): DesktopIcon, HomeIconInfo, IconReader, CurrentMoveEpoch, MoveIconTarget, Native, EnumWindowsProc, LowLevelMouseProc (+5 more)

### Community 2 - "TabletWallpaperEngine"
Cohesion: 0.06
Nodes (7): 1. Project Overview, DiyarWallpaperService, TabletWallpaperEngine, object@L158, WebViewClient, WallpaperPresentation, PrototypeAssets

### Community 3 - "icons.py"
Cohesion: 0.09
Nodes (27): _clean_url_key(), desktop_entries(), GioMetadataAdapter, grid_rect(), GridAdapter, IconAdapter, _looks_like_url(), make_adapter() (+19 more)

### Community 4 - "with"
Cohesion: 0.05
Nodes (51): name, runs-on, steps, name, runs-on, steps, name, runs-on (+43 more)

### Community 6 - "wallpaper.py"
Cohesion: 0.08
Nodes (9): NativeAudioPlayer, _player_command(), resolve_theme_audio_path(), helper_example(), write_helper_template(), _load_indicator(), _has_gst_autoaudiosink(), test_native_audio_player_lifecycle() (+1 more)

### Community 8 - "strike-props.js"
Cohesion: 0.10
Nodes (44): balls, buildStrikeAtlasCanvas(), bulletDecals, canisters, chickens, crates, drawStrikeProps(), impactBursts (+36 more)

### Community 9 - "importer.py"
Cohesion: 0.13
Nodes (23): _copy_limited(), _extract_html_title(), _find_archive_thumb(), _find_entry_html(), _groups_from_settings(), import_theme_file(), load_custom_themes(), _media_params() (+15 more)

### Community 10 - "WallpaperForm"
Cohesion: 0.10
Nodes (6): WallpaperForm, Fatal, LastIcons, PageUrl, ShowWithoutActivation, WebViewConfig

### Community 11 - "Deskland Preview — Linux port"
Cohesion: 0.06
Nodes (26): _backend_args(), DesklandApplication, main(), configure_single_gpu_env(), _connected_gpu_vendors(), _find_vendor_json(), select_single_egl_vendor(), 1. Component mapping (+18 more)

### Community 12 - "roach-props.js"
Cohesion: 0.10
Nodes (38): bombs, bubbles, buildRoachAtlas(), drawRoachProps(), explosions, initRoachProps(), jetStrikes, pickRoachAt() (+30 more)

### Community 14 - "HostContext"
Cohesion: 0.16
Nodes (3): HostContext, AutoStartShortcutPath, Json

### Community 15 - "CustomThemes"
Cohesion: 0.13
Nodes (5): Settings, CustomThemes, Dir, RegistryPath, ZipEntryPlan

### Community 16 - "DesktopHost.cs"
Cohesion: 0.07
Nodes (5): AppIcon, InstallProfile, Log, Program, Rename

### Community 17 - "ThemeStore"
Cohesion: 0.12
Nodes (3): ThemeStore, Listener, ThemeStoreTest

### Community 18 - "thinking-orbs-engine.js"
Cohesion: 0.21
Nodes (28): angleDelta(), applyMoves(), below(), braid(), fibDir(), finalize(), frac(), frame() (+20 more)

### Community 19 - "pocket-props.js"
Cohesion: 0.12
Nodes (27): buildPocketAtlasCanvas(), DE_WORDS, detectFolderNation(), divisions, drawPocketProps(), EN_WORDS, forts, initPocketAtlas() (+19 more)

### Community 20 - "SettingsWindow"
Cohesion: 0.13
Nodes (5): BridgeWebView, _js_value_to_string(), SettingsWindow, test_settings_window_unloads_webview_when_hidden(), test_settings_window_opens_external_credit_links_via_xdg_open()

### Community 21 - "DiyarDesk"
Cohesion: 0.07
Nodes (24): Android Tablet Desteği (`sw600dp+`), Android Tablets (`sw600dp+`), Browser preview, Credits and license, Dahili Temalar ve Özel Tema İçe Aktarma, Destek, DiyarDesk, Features (+16 more)

### Community 22 - "rift-props.js"
Cohesion: 0.15
Nodes (25): drawRiftProps(), heroes, initRiftAtlas(), rebuildRiftProps(), riftBufA, riftBufB, riftDrawLeafCluster(), riftHash() (+17 more)

### Community 23 - "rosebrook-blooms.js"
Cohesion: 0.13
Nodes (22): ambientBlooms, backOutEase(), detectDroppedIcons(), drawRoseBrookBlooms(), driftingPetals, ensureRoseBrookResources(), iconBlooms, makeRoseBrookAtlas() (+14 more)

### Community 25 - "config.py"
Cohesion: 0.17
Nodes (14): atomic_write(), autostart_path(), config_dir(), config_home(), data_home(), Log, log_path(), pictures_dir() (+6 more)

### Community 28 - "test_wallpaper_insets.py"
Cohesion: 0.12
Nodes (15): _build_safe_inset_script(), compute_caelestia_insets(), detect_layer_shell_safe_insets(), _has_layer_namespace(), _is_x11_display(), load_layer_shell(), test_compute_caelestia_insets_defaults_and_custom_thresholds(), test_detect_layer_shell_safe_insets_backends_and_layers() (+7 more)

### Community 29 - "app.py"
Cohesion: 0.21
Nodes (11): _icon_path(), desktop_dir(), copy_files(), copy_image(), data_url_bytes(), open_path(), reveal_path(), save_share() (+3 more)

### Community 30 - "share.js"
Cohesion: 0.20
Nodes (20): addRoundRect(), drawCursor(), drawIcon(), drawSampleIcons(), drawSelected(), labelsReady(), limitedRangeFilter(), markLimitedRange() (+12 more)

### Community 32 - "wall-icons.js"
Cohesion: 0.25
Nodes (20): clampPos(), dispatchMergedIcons(), effectiveCollapsed(), effectiveEnabled(), esc(), handleRealHostEvent(), hasRealHostIcons(), installWebViewProxy() (+12 more)

### Community 33 - "steps"
Cohesion: 0.10
Nodes (19): runs-on, steps, jobs, build-android, name, on, push, workflow_dispatch (+11 more)

### Community 35 - "BoundedReadStream"
Cohesion: 0.12
Nodes (7): WebCustomHelper, BoundedReadStream, CanRead, CanSeek, CanWrite, Length, Position

### Community 37 - "steps"
Cohesion: 0.11
Nodes (17): runs-on, steps, jobs, build-windows, name, on, push, workflow_dispatch (+9 more)

### Community 38 - "glade-trees.js"
Cohesion: 0.18
Nodes (16): birds, drawGladeForest(), ensureGladeResources(), gladeBufA, gladeBufB, gladeRand(), makeGladeSpriteAtlas(), drawShadow() (+8 more)

### Community 39 - "PauseMonitor"
Cohesion: 0.26
Nodes (4): PauseMonitor, _run(), test_pause_monitor_low_mode_aggressive_coverage(), test_pause_monitor_uses_gnome_extension_on_wayland()

### Community 40 - "test_performance.py"
Cohesion: 0.16
Nodes (4): plasma_pause_path(), _make_fake_plasma_wallpaper(), test_plasma_lazy_share_renderer_lifecycle(), test_plasma_pause_state_file_and_lazy_page_load()

### Community 43 - "autostart.py"
Cohesion: 0.24
Nodes (5): command_for_autostart(), entry_text(), is_enabled(), set_enabled(), test_autostart_roundtrip()

### Community 44 - ".__init__"
Cohesion: 0.21
Nodes (4): call_gnome_shell_extension(), has_gnome_wallpaper_extension(), _has_plasma_wallpaper_plugin(), primary_geometry()

### Community 45 - "makeDesertAtlas"
Cohesion: 0.24
Nodes (9): initDesertSpriteBatch(), makeDesertAtlas(), paintBedouinTent(), paintCamel(), paintOasisBush(), paintPalm(), paintRockScrub(), paintTraveler() (+1 more)

### Community 46 - "meadow-boy.js"
Cohesion: 0.19
Nodes (5): createMeadowBoyScene(), drawMeadowBoy(), meadowBoyPose(), meadowBoyWavePull(), prepareMeadowBoy()

### Community 47 - "StaticWallpaper"
Cohesion: 0.33
Nodes (3): _out(), _run(), StaticWallpaper

### Community 48 - "AutoStartCheck"
Cohesion: 0.29
Nodes (3): AutoStartCheck, EnabledPath, LastPath

### Community 50 - "inject.js"
Cohesion: 0.38
Nodes (8): deliverIcons(), navigateToThemeUrl(), pollIcons(), pollPause(), pollSettings(), syncPause(), tryBuiltinOrCustomTheme(), tryCustomTheme()

### Community 51 - "aurora-pines.js"
Cohesion: 0.29
Nodes (8): auroraRand(), auroraSpotClear(), drawAuroraProps(), ensureAuroraSpriteResources(), lanterns, makeAuroraSpriteAtlas(), rebuildAuroraProps(), trees

### Community 54 - "beach-palms.js"
Cohesion: 0.43
Nodes (6): BEACH_PALM_STYLES, beachPalmClear(), beachPalmImages, chooseMaldivesPalms(), drawMaldivesPalms(), makeMaldivesPalmAtlas()

### Community 55 - "meadow-cat.js"
Cohesion: 0.43
Nodes (5): createMeadowCatScene(), meadowCatChoosePlace(), meadowCatRunLanes(), meadowCatSegmentDistance(), prepareMeadowCat()

### Community 57 - "Deskland Windows 宿主"
Cohesion: 0.33
Nodes (5): Deskland Windows 宿主, 常用参数, 构建与运行, 行为与数据, 页面通信

### Community 58 - "low-mode.js"
Cohesion: 0.70
Nodes (4): applyLowMode(), ensureLowModeStyle(), handleMsg(), syncDomClass()

## Knowledge Gaps
- **15 isolated node(s):** `LastPath`, `EnabledPath`, `AutoStartShortcutPath`, `CanRead`, `CanSeek` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 395 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Wallpaper` connect `Wallpaper` to `DesklandHost`, `wallpaper.py`, `PauseMonitor`, `test_performance.py`, `.__init__`, `StaticWallpaper`, `SettingsWindow`, `._is_x11_point_over_desktop`, `test_wallpaper_insets.py`, `app.py`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `Wallpaper` (e.g. with `DesklandHost` and `NativeAudioPlayer`) actually correct?**
  _`Wallpaper` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LastPath`, `EnabledPath`, `AutoStartShortcutPath` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DesklandHost` be split into smaller, more focused modules?**
  _Cohesion score 0.052805280528052806 - nodes in this community are weakly interconnected._
- **Why does `DiyarDesk — Repository & Development Guide (`AGENTS.md`)` connect `DesklandHost` to `TabletWallpaperEngine`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `DesklandHost` (e.g. with `2. Repository Layout` and `I18n`) actually correct?**
  _`DesklandHost` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Should `Native` be split into smaller, more focused modules?**
  _Cohesion score 0.06376237623762376 - nodes in this community are weakly interconnected._