/*
 * Deskland IconSpy plasmoid for KDE Plasma 6 (Wayland / X11).
 *
 * Runs invisibly inside the desktop folder-view containment, locates the
 * containment's FolderView GridView in the QML scene graph, and writes
 * physical-pixel icon rectangles every 500 ms to ~/.cache/deskland/icons.json
 * using an atomic rename.
 */

import QtQuick
import QtQuick.Layouts
import QtQuick.Window
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.plasma5support as Plasma5Support

PlasmoidItem {
    id: root

    Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground
    Layout.preferredWidth: 1
    Layout.preferredHeight: 1
    Layout.minimumWidth: 1
    Layout.minimumHeight: 1
    implicitWidth: 1
    implicitHeight: 1
    opacity: 0
    enabled: false

    property var cachedGridView: null
    property var cachedWallpaper: null
    property var pointerTargetGv: null
    property var pointerBridgeObj: null
    property var visibleDelegates: []
    property var orbitalTransforms: []
    property bool orbitControlVisible: false
    property bool orbitPaused: false
    property bool execBusy: false
    property double execStartedAt: 0
    property double lastWriteTs: 0
    property string lastWrittenPayload: ""

    Plasma5Support.DataSource {
        id: writer
        engine: "executable"
        connectedSources: []
        onNewData: function (sourceName, data) {
            disconnectSource(sourceName);
            root.execBusy = false;
        }
    }

    function toBase64Utf8(str) {
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 0x80) {
                bytes.push(c);
            } else if (c < 0x800) {
                bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
            } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
                var c2 = str.charCodeAt(++i);
                var cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
                bytes.push(
                    0xf0 | (cp >> 18),
                    0x80 | ((cp >> 12) & 0x3f),
                    0x80 | ((cp >> 6) & 0x3f),
                    0x80 | (cp & 0x3f)
                );
            } else {
                bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
            }
        }
        var tbl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var out = "";
        for (var j = 0; j < bytes.length; j += 3) {
            var b0 = bytes[j];
            var b1 = j + 1 < bytes.length ? bytes[j + 1] : 0;
            var b2 = j + 2 < bytes.length ? bytes[j + 2] : 0;
            out += tbl[b0 >> 2];
            out += tbl[((b0 & 3) << 4) | (b1 >> 4)];
            out += (j + 1 < bytes.length) ? tbl[((b1 & 15) << 2) | (b2 >> 6)] : "=";
            out += (j + 2 < bytes.length) ? tbl[b2 & 63] : "=";
        }
        return out;
    }

    function writeJson(obj) {
        var now = Date.now();
        if (root.execBusy && (now - root.execStartedAt) < 2500) {
            return;
        }
        try {
            var payload = JSON.stringify({
                vis: !!obj.vis,
                r: obj.r || [],
                n: obj.n || []
            });
            // Keepalive rewrite every 30s (inject.js uses 90s TTL) so we do
            // not fork a shell twice a second when desktop icons are idle.
            if (payload === root.lastWrittenPayload && (now - root.lastWriteTs) < 30000) {
                return;
            }
            var json = JSON.stringify(obj);
            var b64 = toBase64Utf8(json);
            var cmd = "sh -c 'mkdir -p \"$HOME/.cache/deskland\" && printf \"%s\" \"" + b64
                + "\" | base64 -d > \"$HOME/.cache/deskland/icons.json.tmp\" && mv -f \"$HOME/.cache/deskland/icons.json.tmp\" \"$HOME/.cache/deskland/icons.json\"'";
            root.execBusy = true;
            root.execStartedAt = now;
            root.lastWriteTs = now;
            root.lastWrittenPayload = payload;
            writer.connectSource(cmd);
        } catch (e) {
            root.execBusy = false;
            root.lastWrittenPayload = "";
        }
    }

    function findContainmentRoot() {
        var cur = root;
        while (cur) {
            if (cur.plasmoid !== undefined && cur.plasmoid !== null && cur.plasmoid.isContainment) {
                return cur;
            }
            if (!cur.parent) {
                return cur;
            }
            cur = cur.parent;
        }
        return null;
    }

    function isPrimaryContainment(top) {
        if (!top) return false;
        if (top.screen !== undefined && top.screen !== 0) {
            return false;
        }
        try {
            var screens = Qt.application.screens;
            if (screens && screens.length > 0 && top.screenGeometry) {
                var p = screens[0];
                if (top.screenGeometry.x !== p.virtualX || top.screenGeometry.y !== p.virtualY) {
                    return false;
                }
            }
        } catch (e) {
            // Fall back to top.screen === 0
        }
        return true;
    }

    function findGridView(item, depth) {
        if (!item || depth > 25) return null;
        var kids = item.children;
        if (!kids) return null;
        for (var i = 0; i < kids.length; i++) {
            var it = kids[i];
            if (it && it.cellWidth !== undefined && it.cellHeight !== undefined
                    && it.model !== undefined && it.count !== undefined
                    && it.itemAtIndex !== undefined) {
                return it;
            }
            var found = findGridView(it, depth + 1);
            if (found) return found;
        }
        return null;
    }

    function findWallpaperByObjectName(item, depth) {
        if (!item || depth > 25) return null;
        if (item.objectName === "desklandWallpaper" && typeof item.dispatchPointer === "function") {
            return item;
        }
        var kids = item.children;
        if (!kids) return null;
        for (var i = 0; i < kids.length; i++) {
            var found = findWallpaperByObjectName(kids[i], depth + 1);
            if (found) return found;
        }
        return null;
    }

    function resolveWallpaper(top) {
        if (root.cachedWallpaper) {
            try {
                if (typeof root.cachedWallpaper.dispatchPointer === "function") {
                    return bindWallpaperMover(root.cachedWallpaper);
                }
            } catch (e) {}
            root.cachedWallpaper = null;
        }
        if (top) {
            try {
                if (top.wallpaper && typeof top.wallpaper.dispatchPointer === "function") {
                    root.cachedWallpaper = top.wallpaper;
                    return bindWallpaperMover(root.cachedWallpaper);
                }
                if (top.wallpaperGraphicsObject && typeof top.wallpaperGraphicsObject.dispatchPointer === "function") {
                    root.cachedWallpaper = top.wallpaperGraphicsObject;
                    return bindWallpaperMover(root.cachedWallpaper);
                }
                if (top.wallpaper && top.wallpaper.wallpaperGraphicsObject && typeof top.wallpaper.wallpaperGraphicsObject.dispatchPointer === "function") {
                    root.cachedWallpaper = top.wallpaper.wallpaperGraphicsObject;
                    return bindWallpaperMover(root.cachedWallpaper);
                }
            } catch (e) {}
        }
        var win = root.Window ? root.Window.window : null;
        if (win && win.contentItem) {
            root.cachedWallpaper = findWallpaperByObjectName(win.contentItem, 0);
            if (root.cachedWallpaper) {
                try { root.cachedWallpaper.iconMover = root; } catch (e) {}
                return root.cachedWallpaper;
            }
        }
        return null;
    }

    function bindWallpaperMover(w) {
        if (!w) return null;
        try {
            if (w.iconMover !== root) w.iconMover = root;
        } catch (e) {}
        return w;
    }

    function findTransformEntry(it) {
        for (var i = 0; i < root.orbitalTransforms.length; i++) {
            if (root.orbitalTransforms[i].item === it) {
                return root.orbitalTransforms[i];
            }
        }
        return null;
    }

    function ensureOrbitalTransform(it) {
        var existing = findTransformEntry(it);
        if (existing && existing.tr) return existing.tr;
        try {
            var tr = Qt.createQmlObject('import QtQuick; Translate { x: 0; y: 0 }', it, 'desklandOrbitalTranslate');
            it.transform.push(tr);
            var list = root.orbitalTransforms.slice();
            list.push({ item: it, tr: tr });
            root.orbitalTransforms = list;
            return tr;
        } catch (e) {
            return null;
        }
    }

    function getOrbitalOffset(it) {
        var entry = findTransformEntry(it);
        if (entry && entry.tr) {
            try {
                return { x: Number(entry.tr.x) || 0, y: Number(entry.tr.y) || 0 };
            } catch (e) {}
        }
        return { x: 0, y: 0 };
    }

    function resetMoveIcons(clearControl) {
        var kept = [];
        for (var i = 0; i < root.orbitalTransforms.length; i++) {
            var entry = root.orbitalTransforms[i];
            try {
                if (entry.item && entry.tr) {
                    entry.tr.x = 0;
                    entry.tr.y = 0;
                    kept.push(entry);
                }
            } catch (e) {}
        }
        root.orbitalTransforms = kept;
        if (clearControl === true) {
            root.orbitPaused = false;
            root.orbitControlVisible = false;
        }
    }

    function toggleOrbitPause() {
        root.orbitPaused = !root.orbitPaused;
        if (root.orbitPaused) {
            resetMoveIcons(false);
        }
    }

    function applyMoveIcons(rawJson) {
        var msg = null;
        try {
            msg = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
        } catch (e) {
            return;
        }
        if (!msg || msg.reset === true || !Array.isArray(msg.icons) || msg.icons.length === 0) {
            resetMoveIcons(true);
            return;
        }
        root.orbitControlVisible = true;
        if (root.orbitPaused) {
            return;
        }
        var top = root.findContainmentRoot();
        var w = root.resolveWallpaper(top);
        var gv = root.cachedGridView;
        if (!w || !gv || !root.visibleDelegates || root.visibleDelegates.length === 0) {
            return;
        }
        var win = root.Window ? root.Window.window : null;
        var dpr = (win && win.devicePixelRatio > 0) ? win.devicePixelRatio : 1;
        var wW = Number(w.width) || 1920;
        var wH = Number(w.height) || 1080;

        for (var i = 0; i < msg.icons.length; i++) {
            var spec = msg.icons[i];
            if (!spec || typeof spec.index !== "number") continue;
            var it = root.visibleDelegates[spec.index];
            if (!it) continue;
            try {
                if (!it.visible) continue;
                if (gv.hoveredItem === it) continue;
                var tr = ensureOrbitalTransform(it);
                if (!tr) continue;
                var curInW = it.mapToItem(w, it.width * 0.5, it.height * 0.5);
                var homeCx = curInW.x - tr.x;
                var homeCy = curInW.y - tr.y;
                var tx = (typeof spec.cssX === "number") ? spec.cssX : (Number(spec.x) / dpr);
                var ty = (typeof spec.cssY === "number") ? spec.cssY : (Number(spec.y) / dpr);
                if (!isFinite(tx) || !isFinite(ty)) continue;
                var mx = Math.max(24, it.width * 0.5);
                var my = Math.max(24, it.height * 0.5);
                tx = Math.max(mx, Math.min(wW - mx, tx));
                ty = Math.max(my, Math.min(wH - my, ty));
                tr.x = tx - homeCx;
                tr.y = ty - homeCy;
            } catch (e) {}
        }
    }

    function attachPointerBridge(top, gv) {
        if (!top || !gv) return;
        if (root.pointerTargetGv === gv && root.pointerBridgeObj) return;
        if (root.pointerBridgeObj) {
            try { root.pointerBridgeObj.destroy(); } catch (e) {}
            root.pointerBridgeObj = null;
        }
        root.pointerTargetGv = gv;
        try {
            root.pointerBridgeObj = Qt.createQmlObject(
                'import QtQuick\n'
                + 'Item {\n'
                + '  anchors.fill: parent\n'
                + '  z: 100\n'
                + '  property var spy: null\n'
                + '  property var topItem: null\n'
                + '  property var gvItem: null\n'
                + '  property bool dragging: false\n'
                + '  property real lastX: -9999\n'
                + '  property real lastY: -9999\n'
                + '  property real lastHoverTs: 0\n'
                + '  property real lastHoverX: -9999\n'
                + '  property real lastHoverY: -9999\n'
                + '  function wallPos(px, py) {\n'
                + '    var w = spy ? spy.resolveWallpaper(topItem) : null;\n'
                + '    if (!w) return null;\n'
                + '    try {\n'
                + '      var p = gvItem.mapToItem(w, px, py);\n'
                + '      return { w: w, x: p.x, y: p.y };\n'
                + '    } catch (e) {\n'
                + '      var g = gvItem.mapToGlobal(px, py);\n'
                + '      var wg = w.mapToGlobal(0, 0);\n'
                + '      return { w: w, x: g.x - wg.x, y: g.y - wg.y };\n'
                + '    }\n'
                + '  }\n'
                + '  PointHandler {\n'
                + '    id: ph\n'
                + '    target: null\n'
                + '    acceptedButtons: Qt.LeftButton\n'
                + '    grabPermissions: PointerHandler.TakeOverForbidden\n'
                + '    onActiveChanged: {\n'
                + '      if (ph.active) {\n'
                + '        if (orbitBtn.visible && ph.point.position.x >= orbitBtn.x && ph.point.position.x <= orbitBtn.x + orbitBtn.width && ph.point.position.y >= orbitBtn.y && ph.point.position.y <= orbitBtn.y + orbitBtn.height) return;\n'
                + '        if (gvItem && gvItem.hoveredItem) return;\n'
                + '        var wp = wallPos(ph.point.position.x, ph.point.position.y);\n'
                + '        if (!wp) return;\n'
                + '        dragging = true;\n'
                + '        lastX = wp.x; lastY = wp.y;\n'
                + '        wp.w.dispatchPointer("down", wp.x, wp.y);\n'
                + '      } else if (dragging) {\n'
                + '        dragging = false;\n'
                + '        var wp2 = wallPos(ph.point.position.x, ph.point.position.y);\n'
                + '        if (wp2) wp2.w.dispatchPointer("up", wp2.x, wp2.y);\n'
                + '      }\n'
                + '    }\n'
                + '    onPointChanged: {\n'
                + '      if (!ph.active || !dragging) return;\n'
                + '      var wp = wallPos(ph.point.position.x, ph.point.position.y);\n'
                + '      if (!wp) return;\n'
                + '      if (Math.abs(wp.x - lastX) + Math.abs(wp.y - lastY) < 0.5) return;\n'
                + '      lastX = wp.x; lastY = wp.y;\n'
                + '      wp.w.dispatchPointer("move", wp.x, wp.y);\n'
                + '    }\n'
                + '  }\n'
                + '  HoverHandler {\n'
                + '    id: hh\n'
                + '    acceptedDevices: PointerDevice.AllDevices\n'
                + '    onHoveredChanged: {\n'
                + '      if (!hh.hovered && !dragging) {\n'
                + '        var w = spy ? spy.resolveWallpaper(topItem) : null;\n'
                + '        if (w) w.dispatchPointer("leave", 0, 0);\n'
                + '      }\n'
                + '    }\n'
                + '    onPointChanged: {\n'
                + '      if (!hh.hovered || dragging) return;\n'
                + '      var now = Date.now();\n'
                + '      if ((now - lastHoverTs) < 28) return;\n'
                + '      var wp = wallPos(hh.point.position.x, hh.point.position.y);\n'
                + '      if (!wp) return;\n'
                + '      if (Math.abs(wp.x - lastHoverX) + Math.abs(wp.y - lastHoverY) < 1.5) return;\n'
                + '      lastHoverTs = now; lastHoverX = wp.x; lastHoverY = wp.y;\n'
                + '      wp.w.dispatchPointer("hover", wp.x, wp.y);\n'
                + '    }\n'
                + '  }\n'
                + '  Rectangle {\n'
                + '    id: orbitBtn\n'
                + '    z: 200\n'
                + '    visible: !!(spy && spy.orbitControlVisible)\n'
                + '    anchors.right: parent.right\n'
                + '    anchors.bottom: parent.bottom\n'
                + '    anchors.rightMargin: 18\n'
                + '    anchors.bottomMargin: 18\n'
                + '    height: 36\n'
                + '    width: btnRow.implicitWidth + 26\n'
                + '    radius: 18\n'
                + '    color: btnMa.containsMouse ? (spy && spy.orbitPaused ? "#eb24384c" : "#eb1b2638") : "#cc0d1421"\n'
                + '    border.width: 1\n'
                + '    border.color: spy && spy.orbitPaused ? "#99ffd27d" : "#779bc6ff"\n'
                + '    Row {\n'
                + '      id: btnRow\n'
                + '      anchors.centerIn: parent\n'
                + '      spacing: 7\n'
                + '      Text {\n'
                + '        text: (spy && spy.orbitPaused) ? "\\u25B6" : "\\u23F8"\n'
                + '        color: (spy && spy.orbitPaused) ? "#ffd88a" : "#9fd0ff"\n'
                + '        font.pixelSize: 13\n'
                + '        anchors.verticalCenter: parent.verticalCenter\n'
                + '      }\n'
                + '      Text {\n'
                + '        text: (spy && spy.orbitPaused) ? "İkonları Döndür" : "İkonları Durdur"\n'
                + '        color: "#eef4ff"\n'
                + '        font.pixelSize: 12\n'
                + '        font.weight: Font.Medium\n'
                + '        anchors.verticalCenter: parent.verticalCenter\n'
                + '      }\n'
                + '    }\n'
                + '    MouseArea {\n'
                + '      id: btnMa\n'
                + '      anchors.fill: parent\n'
                + '      hoverEnabled: true\n'
                + '      cursorShape: Qt.PointingHandCursor\n'
                + '      onPressed: function(mouse) { mouse.accepted = true; }\n'
                + '      onClicked: function(mouse) {\n'
                + '        mouse.accepted = true;\n'
                + '        if (spy) spy.toggleOrbitPause();\n'
                + '      }\n'
                + '    }\n'
                + '  }\n'
                + '}\n',
                gv,
                "desklandPointerBridge"
            );
            root.pointerBridgeObj.spy = root;
            root.pointerBridgeObj.topItem = top;
            root.pointerBridgeObj.gvItem = gv;
            console.info("Deskland iconspy pointer bridge attached; wallpaperFound=" + !!root.resolveWallpaper(top));
        } catch (e) {
            console.warn("Deskland iconspy pointer bridge error:", e);
            root.pointerBridgeObj = null;
        }
    }

    function collectIcons(top, gv) {
        var rects = [];
        var names = [];
        var items = [];
        var win = root.Window ? root.Window.window : null;
        var dpr = (win && win.devicePixelRatio > 0) ? win.devicePixelRatio : 1;
        var originX = 0;
        var originY = 0;
        if (top.screenGeometry) {
            originX = top.screenGeometry.x || 0;
            originY = top.screenGeometry.y || 0;
        }
        var topGlobal = top.mapToGlobal(0, 0);
        var cnt = Math.min(gv.count || 0, 4096);
        for (var i = 0; i < cnt; i++) {
            var it = gv.itemAtIndex(i);
            if (!it || it.blank === true || !it.visible) continue;
            var pos;
            try {
                pos = it.mapToItem(top, 0, 0);
            } catch (e) {
                var g = it.mapToGlobal(0, 0);
                pos = { x: g.x - topGlobal.x - originX, y: g.y - topGlobal.y - originY };
            }
            var off = getOrbitalOffset(it);
            var homeX = pos.x - off.x;
            var homeY = pos.y - off.y;
            var w = (it.width > 0) ? it.width : gv.cellWidth;
            var h = (it.height > 0) ? it.height : gv.cellHeight;
            if (w <= 0 || h <= 0) continue;
            var l = Math.round(homeX * dpr);
            var t = Math.round(homeY * dpr);
            var r = Math.round((homeX + w) * dpr);
            var b = Math.round((homeY + h) * dpr);
            rects.push([l, t, r, b]);
            names.push(typeof it.display === "string" ? it.display : "");
            items.push(it);
        }
        root.visibleDelegates = items;
        return { rects: rects, names: names };
    }

    Component.onDestruction: resetMoveIcons(true)

    Timer {
        id: pollTimer
        interval: 750
        repeat: true
        running: true
        triggeredOnStart: true
        onTriggered: {
            try {
                var top = root.findContainmentRoot();
                if (!root.isPrimaryContainment(top)) {
                    return;
                }
                var gv = root.cachedGridView;
                if (gv) {
                    try {
                        if (gv.count === undefined || gv.cellWidth === undefined || !gv.visible) {
                            gv = null;
                        }
                    } catch (e) {
                        gv = null;
                    }
                }
                if (!gv && top) {
                    gv = root.findGridView(top, 0);
                }
                root.cachedGridView = gv;
                if (!gv) {
                    root.writeJson({ ts: Date.now(), vis: false, r: [], n: [] });
                    return;
                }
                root.attachPointerBridge(top, gv);
                var data = root.collectIcons(top, gv);
                root.writeJson({ ts: Date.now(), vis: true, r: data.rects, n: data.names });
            } catch (e) {
                root.writeJson({ ts: Date.now(), vis: false, r: [], n: [] });
            }
        }
    }
}
