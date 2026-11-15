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
                    return root.cachedWallpaper;
                }
            } catch (e) {}
            root.cachedWallpaper = null;
        }
        if (top) {
            try {
                if (top.wallpaper && typeof top.wallpaper.dispatchPointer === "function") {
                    root.cachedWallpaper = top.wallpaper;
                    return root.cachedWallpaper;
                }
                if (top.wallpaperGraphicsObject && typeof top.wallpaperGraphicsObject.dispatchPointer === "function") {
                    root.cachedWallpaper = top.wallpaperGraphicsObject;
                    return root.cachedWallpaper;
                }
                if (top.wallpaper && top.wallpaper.wallpaperGraphicsObject && typeof top.wallpaper.wallpaperGraphicsObject.dispatchPointer === "function") {
                    root.cachedWallpaper = top.wallpaper.wallpaperGraphicsObject;
                    return root.cachedWallpaper;
                }
            } catch (e) {}
        }
        var win = root.Window ? root.Window.window : null;
        if (win && win.contentItem) {
            root.cachedWallpaper = findWallpaperByObjectName(win.contentItem, 0);
            if (root.cachedWallpaper) return root.cachedWallpaper;
        }
        return null;
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
            var w = (it.width > 0) ? it.width : gv.cellWidth;
            var h = (it.height > 0) ? it.height : gv.cellHeight;
            if (w <= 0 || h <= 0) continue;
            var l = Math.round(pos.x * dpr);
            var t = Math.round(pos.y * dpr);
            var r = Math.round((pos.x + w) * dpr);
            var b = Math.round((pos.y + h) * dpr);
            rects.push([l, t, r, b]);
            names.push(typeof it.display === "string" ? it.display : "");
        }
        return { rects: rects, names: names };
    }

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
