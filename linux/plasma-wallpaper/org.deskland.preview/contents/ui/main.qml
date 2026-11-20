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
    property string theme: "papercut"
    property string homeDir: {
        var base = String(StandardPaths.writableLocation(StandardPaths.GenericConfigLocation));
        // "file:///home/user/.config" -> "/home/user"
        base = base.replace(/^file:\/\//, "");
        base = base.replace(/\/\.config\/?$/, "");
        return base.replace(/\/+$/, "");
    }
    property bool pageReady: false
    property bool windowPaused: false
    property bool screenshotPaused: false
    property bool lowMode: false
    property bool disableAutoPause: false
    property var iconMover: null
    property bool iconMoveActive: false
    property double lastIconMoveAt: 0
    readonly property bool showingDesktop: KWindowSystem.showingDesktop
    readonly property bool effectivePaused: pageReady && !disableAutoPause && (screenshotPaused || (windowPaused && !showingDesktop))

    onShowingDesktopChanged: pauseEvalTimer.restart()

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
        var covered = false;
        var hasScreenshot = false;
        var count = tasksModel.count;
        for (var i = 0; i < count; i++) {
            var idx = tasksModel.index(i, 0);
            if (!tasksModel.data(idx, TaskManager.AbstractTasksModel.IsWindow))
                continue;
            if (tasksModel.data(idx, TaskManager.AbstractTasksModel.IsMinimized))
                continue;
            if (tasksModel.data(idx, TaskManager.AbstractTasksModel.IsHidden))
                continue;
            var appId = String(tasksModel.data(idx, TaskManager.AbstractTasksModel.AppId) || "").toLowerCase();
            if (appId.indexOf("deskland") !== -1 || appId.indexOf("diyardesk") !== -1)
                continue;
            if (appId.indexOf("spectacle") !== -1 || appId.indexOf("flameshot") !== -1 || appId.indexOf("ksnip") !== -1) {
                hasScreenshot = true;
                covered = true;
                break;
            }
            if (!tasksModel.data(idx, TaskManager.AbstractTasksModel.IsActive))
                continue;
            if (tasksModel.data(idx, TaskManager.AbstractTasksModel.SkipTaskbar))
                continue;
            if (!KWindowSystem.showingDesktop
                    && (Boolean(tasksModel.data(idx, TaskManager.AbstractTasksModel.IsFullScreen))
                        || (root.lowMode && Boolean(tasksModel.data(idx, TaskManager.AbstractTasksModel.IsMaximized))))) {
                covered = true;
                break;
            }
        }
        root.screenshotPaused = hasScreenshot;
        root.windowPaused = (KWindowSystem.showingDesktop && !hasScreenshot) ? false : covered;
    }

    function applyEffectivePause() {
        if (!root.pageReady) return;
        if (root.effectivePaused) {
            view.runJavaScript("window.__desklandSetHostPaused&&window.__desklandSetHostPaused(true);");
            freezeTimer.restart();
        } else {
            freezeTimer.stop();
            try { view.lifecycleState = WebEngineView.LifecycleState.Active; } catch (e) {}
            view.runJavaScript("window.__desklandSetHostPaused&&window.__desklandSetHostPaused(false);");
        }
    }

    onEffectivePausedChanged: applyEffectivePause()

    Timer {
        id: freezeTimer
        interval: 180
        repeat: false
        onTriggered: {
            if (root.effectivePaused) {
                try { view.lifecycleState = WebEngineView.LifecycleState.Frozen; } catch (e) {}
            }
        }
    }

    Timer {
        id: pauseEvalTimer
        interval: 80
        repeat: false
        onTriggered: root.updateWindowPause()
    }

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
        onActiveTaskChanged: pauseEvalTimer.restart()
        onCountChanged: pauseEvalTimer.restart()
        onDataChanged: pauseEvalTimer.restart()
        onRowsInserted: pauseEvalTimer.restart()
        onRowsRemoved: pauseEvalTimer.restart()
        onModelReset: pauseEvalTimer.restart()
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

    Timer {
        id: settingsSyncTimer
        interval: 1000
        repeat: true
        running: root.pageReady && !root.effectivePaused
        onTriggered: {
            view.runJavaScript(
                "[window.__desklandLowModeState ? '1' : '0', window.__desklandDisableAutoPause ? '1' : '0']",
                function (res) {
                    if (!res || res.length < 2) return;
                    var nextLow = (res[0] === '1');
                    if (nextLow !== root.lowMode) {
                        root.lowMode = nextLow;
                        root.updateWindowPause();
                    }
                    var nextDisable = (res[1] === '1');
                    if (nextDisable !== root.disableAutoPause) {
                        root.disableAutoPause = nextDisable;
                        root.updateWindowPause();
                    }
                }
            );
        }
    }

    Timer {
        id: iconMoveTimer
        interval: root.lowMode ? (root.iconMoveActive ? 150 : 1200) : (root.iconMoveActive ? 40 : 480)
        repeat: true
        running: root.pageReady && !root.effectivePaused && root.iconMover !== null
        onTriggered: {
            view.runJavaScript(
                "[window.__desklandLowModeState ? '1' : '0', window.__desklandDisableAutoPause ? '1' : '0', window.__desklandTakeMoveIcons ? window.__desklandTakeMoveIcons() : '']",
                function (res) {
                    if (!res || res.length < 3) return;
                    var nextLow = (res[0] === '1');
                    if (nextLow !== root.lowMode) {
                        root.lowMode = nextLow;
                        root.updateWindowPause();
                    }
                    var nextDisable = (res[1] === '1');
                    if (nextDisable !== root.disableAutoPause) {
                        root.disableAutoPause = nextDisable;
                        root.updateWindowPause();
                    }
                    var raw = res[2];
                    var mover = root.iconMover;
                    if (!mover || typeof mover.applyMoveIcons !== "function") return;
                    if (raw && raw.length > 0) {
                        root.iconMoveActive = true;
                        root.lastIconMoveAt = Date.now();
                        mover.applyMoveIcons(raw);
                    } else if (root.iconMoveActive && (Date.now() - root.lastIconMoveAt) > 1500) {
                        root.iconMoveActive = false;
                    }
                }
            );
        }
    }

    Component.onDestruction: {
        if (root.iconMover && typeof root.iconMover.resetMoveIcons === "function") {
            root.iconMover.resetMoveIcons(true);
        }
    }

    WebEngineView {
        id: view
        anchors.fill: parent
        url: ""
        backgroundColor: "#000000"
        settings.localContentCanAccessFileUrls: true
        settings.localStorageEnabled: true
        settings.playbackRequiresUserGesture: true
        settings.errorPageEnabled: false

        Component.onCompleted: {
            var pageName = (root.theme === "beach" ? "flat" : root.theme) + ".html";
            view.userScripts.collection = [
                { name: "deskland-bridge",
                  sourceUrl: Qt.resolvedUrl("inject.js"),
                  injectionPoint: WebEngineScript.DocumentCreation,
                  worldId: WebEngineScript.MainWorld },
                { name: "deskland-low-mode",
                  sourceUrl: root.prototypeRoot + "low-mode.js",
                  injectionPoint: WebEngineScript.DocumentCreation,
                  worldId: WebEngineScript.MainWorld }
            ];
            view.url = root.prototypeRoot + pageName
                + "?wallpaper=1&vicons=0"
                + "&v=" + Date.now()
                + "&theme=" + encodeURIComponent(root.theme)
                + "&home=" + encodeURIComponent(root.homeDir);
        }

        onLoadingChanged: function (loadingInfo) {
            if (loadingInfo.status === WebEngineView.LoadStartedStatus) {
                readyGraceTimer.stop();
                root.pageReady = false;
                root.iconMoveActive = false;
                if (root.iconMover && typeof root.iconMover.resetMoveIcons === "function") {
                    root.iconMover.resetMoveIcons(true);
                }
            } else if (loadingInfo.status === WebEngineView.LoadSucceededStatus) {
                readyGraceTimer.restart();
            } else if (loadingInfo.status === WebEngineView.LoadFailedStatus) {
                console.warn("Deskland wallpaper: theme page failed to load");
            }
        }
    }
}
