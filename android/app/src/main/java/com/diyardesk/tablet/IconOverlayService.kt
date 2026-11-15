package com.diyardesk.tablet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/**
 * Floating live overlay service allowing the tablet user to see their REAL home screen icons
 * and widgets directly underneath translucent boxes, with live wallpaper sync as they adjust boxes.
 */
class IconOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var store: ThemeStore
    private var initialBoxesSnapshot: List<NormalizedBox> = emptyList()

    private var canvasView: InteractiveIconCanvasView? = null
    private var canvasParams: WindowManager.LayoutParams? = null
    private var toolbarView: LinearLayout? = null
    private var toolbarParams: WindowManager.LayoutParams? = null
    private var passthroughMode: Boolean = false
    private lateinit var toggleModeBtn: Button

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        store = DiyarAppState.store(this)
        initialBoxesSnapshot = store.getIconBoxes()
        startForegroundNotification()
        showOverlays()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        removeOverlays()
        super.onDestroy()
    }

    private fun startForegroundNotification() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val ch = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.overlay_notif_title),
            NotificationManager.IMPORTANCE_LOW
        )
        nm.createNotificationChannel(ch)

        val notif = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.overlay_notif_title))
            .setContentText(getString(R.string.overlay_notif_text))
            .setSmallIcon(android.R.drawable.ic_menu_edit)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    private fun showOverlays() {
        val lpCanvas = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            layoutInDisplayCutoutMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            } else {
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
        canvasParams = lpCanvas

        val canvas = InteractiveIconCanvasView(this, overlayMode = true).apply {
            setBoxes(initialBoxesSnapshot, notify = false)
            onBoxesModified = { updated ->
                store.setIconBoxes(updated)
            }
        }
        canvasView = canvas
        windowManager.addView(canvas, lpCanvas)

        val dp = resources.displayMetrics.density
        val lpBar = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = (52 * dp).toInt()
        }
        toolbarParams = lpBar

        val bar = buildFloatingToolbar(dp)
        toolbarView = bar
        windowManager.addView(bar, lpBar)
    }

    private fun buildFloatingToolbar(dp: Float): LinearLayout {
        val outer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#E6132A24"))
                cornerRadius = 20f * dp
                setStroke((1.5f * dp).toInt(), Color.parseColor("#66B5EFE0"))
            }
            background = bg
            setPadding((14 * dp).toInt(), (10 * dp).toInt(), (14 * dp).toInt(), (10 * dp).toInt())
        }

        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val grip = TextView(this).apply {
            text = "⠿"
            setTextColor(Color.parseColor("#B5EFE0"))
            textSize = 20f
            setPadding((6 * dp).toInt(), 0, (12 * dp).toInt(), 0)
            var downRawX = 0f
            var downRawY = 0f
            var startX = 0
            var startY = 0
            setOnTouchListener { _, ev ->
                val lp = toolbarParams ?: return@setOnTouchListener false
                when (ev.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        downRawX = ev.rawX
                        downRawY = ev.rawY
                        startX = lp.x
                        startY = lp.y
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        lp.x = startX + (ev.rawX - downRawX).toInt()
                        lp.y = startY + (ev.rawY - downRawY).toInt()
                        toolbarView?.let { windowManager.updateViewLayout(it, lp) }
                        true
                    }
                    else -> false
                }
            }
        }
        row.addView(grip)

        fun pillBtn(label: String, bgHex: String, onClick: () -> Unit): Button = Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 12f
            setTextColor(Color.WHITE)
            minHeight = 0
            minimumHeight = 0
            minWidth = 0
            minimumWidth = 0
            setPadding((10 * dp).toInt(), (7 * dp).toInt(), (10 * dp).toInt(), (7 * dp).toInt())
            background = GradientDrawable().apply {
                setColor(Color.parseColor(bgHex))
                cornerRadius = 12f * dp
            }
            val lp = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            lp.marginStart = (6 * dp).toInt()
            layoutParams = lp
            setOnClickListener { onClick() }
        }

        row.addView(pillBtn(getString(R.string.action_add_icon), "#1F6F5B") {
            ensureEditMode()
            canvasView?.addBox(isWidget = false)
        })
        row.addView(pillBtn(getString(R.string.action_add_widget), "#24594B") {
            ensureEditMode()
            canvasView?.addBox(isWidget = true)
        })
        row.addView(pillBtn(getString(R.string.preset_5x6), "#24594B") {
            ensureEditMode()
            canvasView?.setBoxes(IconLayoutMath.presetTablet5x6(), notify = true)
        })
        row.addView(pillBtn(getString(R.string.action_clear), "#4D2C28") {
            ensureEditMode()
            canvasView?.setBoxes(emptyList(), notify = true)
        })

        toggleModeBtn = pillBtn(getString(R.string.overlay_mode_passthrough), "#4A5A2B") {
            togglePassthrough()
        }
        row.addView(toggleModeBtn)

        row.addView(pillBtn(getString(R.string.action_cancel), "#6B302C") {
            store.setIconBoxes(initialBoxesSnapshot)
            stopSelf()
        })
        row.addView(pillBtn(getString(R.string.action_save), "#1A8C64") {
            canvasView?.let { store.setIconBoxes(it.getBoxes()) }
            Toast.makeText(this, R.string.toast_layout_saved, Toast.LENGTH_SHORT).show()
            stopSelf()
        })

        val hint = TextView(this).apply {
            text = getString(R.string.overlay_tap_hint)
            setTextColor(Color.parseColor("#C7DBD4"))
            textSize = 11f
            setPadding((4 * dp).toInt(), (6 * dp).toInt(), 0, 0)
        }

        outer.addView(row)
        outer.addView(hint)
        return outer
    }

    private fun ensureEditMode() {
        if (passthroughMode) togglePassthrough()
    }

    private fun togglePassthrough() {
        passthroughMode = !passthroughMode
        val canvas = canvasView ?: return
        val lp = canvasParams ?: return
        if (passthroughMode) {
            lp.flags = lp.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
            canvas.alpha = 0.28f
            toggleModeBtn.text = getString(R.string.overlay_mode_edit)
        } else {
            lp.flags = lp.flags and WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE.inv()
            canvas.alpha = 1.0f
            toggleModeBtn.text = getString(R.string.overlay_mode_passthrough)
        }
        windowManager.updateViewLayout(canvas, lp)
    }

    private fun removeOverlays() {
        canvasView?.let { runCatching { windowManager.removeView(it) } }
        toolbarView?.let { runCatching { windowManager.removeView(it) } }
        canvasView = null
        toolbarView = null
    }

    companion object {
        private const val CHANNEL_ID = "diyardesk_icon_overlay"
        private const val NOTIF_ID = 4102
    }
}
