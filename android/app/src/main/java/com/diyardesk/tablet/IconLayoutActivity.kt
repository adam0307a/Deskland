package com.diyardesk.tablet

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.RectF
import android.os.Bundle
import android.view.GestureDetector
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlin.math.max
import kotlin.math.min

/**
 * Tablet icon & widget placeholder layout editor.
 * Allows tablet users to position where their home-screen icons and widgets sit so DiyarDesk themes
 * create shorelines, snow clearings, dunes, or clouds accurately around them.
 */
class IconLayoutActivity : AppCompatActivity() {

    private lateinit var store: ThemeStore
    private lateinit var canvasView: IconEditorView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = DiyarAppState.store(this)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0E1D19"))
        }

        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#132A24"))
            setPadding(24, 16, 24, 16)
            gravity = Gravity.CENTER_VERTICAL
        }

        val title = TextView(this).apply {
            text = getString(R.string.icon_layout_title)
            setTextColor(Color.WHITE)
            textSize = 18f
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        topBar.addView(title)

        fun actionBtn(labelRes: Int, onClick: () -> Unit): Button = Button(this).apply {
            text = getString(labelRes)
            isAllCaps = false
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#1F6F5B"))
            val lp = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            lp.marginStart = 12
            layoutParams = lp
            setOnClickListener { onClick() }
        }

        topBar.addView(actionBtn(R.string.preset_5x6) {
            canvasView.setBoxes(IconLayoutMath.presetTablet5x6())
        })
        topBar.addView(actionBtn(R.string.preset_4x5) {
            canvasView.setBoxes(IconLayoutMath.presetGrid4x5())
        })
        topBar.addView(actionBtn(R.string.action_add_icon) {
            canvasView.addBox(isWidget = false)
        })
        topBar.addView(actionBtn(R.string.action_add_widget) {
            canvasView.addBox(isWidget = true)
        })
        topBar.addView(actionBtn(R.string.action_clear) {
            canvasView.setBoxes(emptyList())
        })
        topBar.addView(actionBtn(R.string.action_save) {
            store.setIconBoxes(canvasView.getBoxes())
            Toast.makeText(this, R.string.toast_layout_saved, Toast.LENGTH_SHORT).show()
            finish()
        })

        val hint = TextView(this).apply {
            text = getString(R.string.icon_layout_hint)
            setTextColor(Color.parseColor("#C7DBD4"))
            textSize = 13f
            setPadding(28, 12, 28, 12)
        }

        canvasView = IconEditorView(this).apply {
            setBoxes(store.getIconBoxes())
        }

        val frame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
            setPadding(28, 8, 28, 28)
            addView(canvasView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }

        root.addView(topBar)
        root.addView(hint)
        root.addView(frame)
        setContentView(root)
    }

    private class IconEditorView(context: Context) : View(context) {
        private val boxes = mutableListOf<NormalizedBox>()
        private var dragIndex = -1
        private var dragOffsetX = 0f
        private var dragOffsetY = 0f
        private val tmpRect = RectF()

        private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#152E28")
        }
        private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#24483F")
            strokeWidth = 2f
            style = Paint.Style.STROKE
        }
        private val iconFill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#552BB38E")
            style = Paint.Style.FILL
        }
        private val widgetFill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#55D9822B")
            style = Paint.Style.FILL
        }
        private val boxStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#B5EFE0")
            strokeWidth = 3f
            style = Paint.Style.STROKE
            pathEffect = DashPathEffect(floatArrayOf(14f, 8f), 0f)
        }
        private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = 26f
            textAlign = Paint.Align.CENTER
        }

        private val doubleTapDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
            override fun onDoubleTap(e: MotionEvent): Boolean {
                val idx = hitTest(e.x, e.y)
                if (idx >= 0) {
                    boxes.removeAt(idx)
                    invalidate()
                    return true
                }
                return false
            }
        })

        fun setBoxes(list: List<NormalizedBox>) {
            boxes.clear()
            boxes.addAll(list)
            invalidate()
        }

        fun getBoxes(): List<NormalizedBox> = boxes.toList()

        fun addBox(isWidget: Boolean) {
            val idx = boxes.size
            val shift = (idx % 6) * 0.04f
            val l = 0.28f + shift
            val t = 0.25f + shift
            val w = if (isWidget) 0.22f else 0.075f
            val h = if (isWidget) 0.18f else 0.115f
            boxes.add(NormalizedBox.clamped(l, t, l + w, t + h, isWidget = isWidget))
            invalidate()
        }

        private fun hitTest(px: Float, py: Float): Int {
            val w = width.coerceAtLeast(1).toFloat()
            val h = height.coerceAtLeast(1).toFloat()
            for (i in boxes.indices.reversed()) {
                val b = boxes[i]
                if (px in (b.left * w)..(b.right * w) && py in (b.top * h)..(b.bottom * h)) {
                    return i
                }
            }
            return -1
        }

        override fun onTouchEvent(event: MotionEvent): Boolean {
            if (doubleTapDetector.onTouchEvent(event)) {
                dragIndex = -1
                return true
            }
            val w = width.coerceAtLeast(1).toFloat()
            val h = height.coerceAtLeast(1).toFloat()
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    dragIndex = hitTest(event.x, event.y)
                    if (dragIndex >= 0) {
                        val b = boxes[dragIndex]
                        dragOffsetX = event.x / w - b.left
                        dragOffsetY = event.y / h - b.top
                    }
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (dragIndex >= 0) {
                        val b = boxes[dragIndex]
                        val bw = b.right - b.left
                        val bh = b.bottom - b.top
                        val nl = min(max(event.x / w - dragOffsetX, 0.01f), 0.99f - bw)
                        val nt = min(max(event.y / h - dragOffsetY, 0.01f), 0.99f - bh)
                        boxes[dragIndex] = NormalizedBox(nl, nt, nl + bw, nt + bh, b.isWidget)
                        invalidate()
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    dragIndex = -1
                    return true
                }
            }
            return super.onTouchEvent(event)
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val w = width.toFloat()
            val h = height.toFloat()
            canvas.drawRoundRect(0f, 0f, w, h, 24f, 24f, bgPaint)

            // Tablet grid reference lines
            for (c in 1..5) {
                val x = w * c / 6f
                canvas.drawLine(x, 0f, x, h, gridPaint)
            }
            for (r in 1..3) {
                val y = h * r / 4f
                canvas.drawLine(0f, y, w, y, gridPaint)
            }

            for (b in boxes) {
                tmpRect.set(b.left * w, b.top * h, b.right * w, b.bottom * h)
                canvas.drawRoundRect(tmpRect, 18f, 18f, if (b.isWidget) widgetFill else iconFill)
                canvas.drawRoundRect(tmpRect, 18f, 18f, boxStroke)
                val label = if (b.isWidget) "Widget" else "App"
                canvas.drawText(label, tmpRect.centerX(), tmpRect.centerY() + 9f, labelPaint)
            }
        }
    }
}
