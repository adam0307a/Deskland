/*
 * Deskland wallpaper for KDE Plasma 6 (Wayland).
 *
 * The Plasma desktop containment is opaque and always sits above ordinary
 * windows, so the Deskland scene cannot be shown as a regular window or a
 * layer-shell surface — it has to BE the wallpaper. This plugin embeds the
 * Deskland theme page (the same HTML/WebGL scene the rest of the app uses)
 * in a WebEngineView and injects the bridge (inject.js) that keeps the
 * scene fed with live icon positions from the folder-view applet config and
 * with the Deskland settings (theme, seed, pause…).
 */

import QtQuick
import Qt.labs.platform
import QtWebEngine
import org.kde.kwindowsystem
import org.kde.plasma.plasmoid
import org.kde.taskmanager as TaskManager

WallpaperItem {
    id: root
    objectName: "desklandWallpaper"

    property string prototypeRoot: "file:///usr/lib/deskland/prototype/"
    property string theme: "meadow"
    property string homeDir: {
        var base = String(StandardPaths.writableLocation(StandardPaths.GenericConfigLocation));
        // "file:///home/user/.config" -> "/home/user"
        base = base.replace(/^file:\/\//, "");
        base = base.replace(/\/\.config\/?$/, "");
        return base.replace(/\/+$/, "");
    }
    property bool pageReady: false
    property bool windowPaused: false
    readonly property bool showingDesktop: KWindowSystem.showingDesktop
    readonly property bool effectivePaused: pageReady && windowPaused && !showingDesktop

    onShowingDesktopChanged: updateWindowPause()

    function dispatchPointer(kind, x, y) {
        if (root.effectivePaused) return;
        view.runJavaScript(
            "if (window.__desklandDispatchPointer) window.__desklandDispatchPointer("
            + JSON.stringify(kind) + "," + Number(x) + "," + Number(y) + ");"
            + "else if (window.roachHostPointer) window.roachHostPointer("
            + JSON.stringify(kind) + "," + Number(x) + "," + Number(y) + ");"
        );
    }

    function updateWindowPause() {
        if (KWindowSystem.showingDesktop) {
            root.windowPaused = false;
            return;
        }
        var covered = false;
        var count = tasksModel.count;
        var screenArea = Math.max(1, root.width * root.height);
        for (var i = 0; i < count; i++) {
            var idx = tasksModel.index(i, 0);
            if (!tasksModel.data(idx, TaskManager.AbstractTasksModel.IsWindow))
                continue;
            if (!tasksModel.data(idx, TaskManager.AbstractTasksModel.IsActive))
                continue;
            if (tasksModel.data(idx, TaskManager.AbstractTasksModel.IsMinimized))
                continue;
            if (tasksModel.data(idx, TaskManager.AbstractTasksModel.IsHidden))
                continue;
            if (tasksModel.data(idx, TaskManager.AbstractTasksModel.SkipTaskbar))
                continue;
            var appId = String(tasksModel.data(idx, TaskManager.AbstractTasksModel.AppId) || "").toLowerCase();
            if (appId.indexOf("deskland") !== -1 || appId.indexOf("diyardesk") !== -1)
                continue;
            var isMax = Boolean(tasksModel.data(idx, TaskManager.AbstractTasksModel.IsMaximized));
            var isFull = Boolean(tasksModel.data(idx, TaskManager.AbstractTasksModel.IsFullScreen));
            if (isMax || isFull) {
                covered = true;
                break;
            }
            var geom = tasksModel.data(idx, TaskManager.AbstractTasksModel.Geometry);
            if (geom && root.width > 0 && root.height > 0
                    && (geom.width * geom.height) >= screenArea * 0.85) {
                covered = true;
                break;
            }
        }
        root.windowPaused = covered;
    }

    function applyEffectivePause() {
        if (!root.pageReady) return;
        if (root.effectivePaused) {
            view.runJavaScript("window.__desklandSetHostPaused&&window.__desklandSetHostPaused(true);");
        } else {
            view.runJavaScript(
                "window.__desklandSetHostPaused&&window.__desklandSetHostPaused(false);"
                + "window.__desklandForcePoll&&window.__desklandForcePoll();"
            );
        }
    }

    onEffectivePausedChanged: applyEffectivePause()

    TaskManager.ActivityInfo {
        id: activityInfo
    }

    TaskManager.TasksModel {
        id: tasksModel
        groupMode: TaskManager.TasksModel.GroupDisabled
        filterByCurrentVirtualDesktop: true
        filterByActivity: true
        activity: activityInfo.currentActivity
        filterMinimized: true
        filterHidden: true
        onActiveTaskChanged: root.updateWindowPause()
        onCountChanged: root.updateWindowPause()
        onDataChanged: root.updateWindowPause()
        onRowsInserted: root.updateWindowPause()
        onRowsRemoved: root.updateWindowPause()
        onModelReset: root.updateWindowPause()
    }

    Timer {
        id: readyGraceTimer
        interval: 800
        repeat: false
        onTriggered: {
            root.pageReady = true;
            root.updateWindowPause();
            root.applyEffectivePause();
        }
    }

    WebEngineView {
        id: view
        anchors.fill: parent
        url: ""
        backgroundColor: "#000000"
        settings.localContentCanAccessFileUrls: true
        settings.localStorageEnabled: true
        settings.playbackRequiresUserGesture: false
        settings.errorPageEnabled: false

        Component.onCompleted: {
            view.userScripts.collection = [
                { name: "deskland-bridge",
                  sourceUrl: Qt.resolvedUrl("inject.js"),
                  injectionPoint: WebEngineScript.DocumentCreation,
                  worldId: WebEngineScript.MainWorld }
            ];
            view.url = root.prototypeRoot + root.theme + ".html"
                + "?wallpaper=1&vicons=0&v=" + Date.now()
                + "&theme=" + encodeURIComponent(root.theme)
                + "&home=" + encodeURIComponent(root.homeDir);
        }

        onLoadingChanged: function (loadingInfo) {
            if (loadingInfo.status === WebEngineView.LoadStartedStatus) {
                readyGraceTimer.stop();
                root.pageReady = false;
            } else if (loadingInfo.status === WebEngineView.LoadSucceededStatus) {
                readyGraceTimer.restart();
            } else if (loadingInfo.status === WebEngineView.LoadFailedStatus) {
                console.warn("Deskland wallpaper: theme page failed to load");
            }
        }
    }
}
