package com.diyardesk.tablet

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.RectF
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View

/**
 * Shared interactive icon/widget placement canvas used by both [IconLayoutActivity]
 * (in-app grid view) and [IconOverlayService] (live translucent overlay over the real home screen).
 */
class InteractiveIconCanvasView(
    context: Context,
    private val overlayMode: Boolean = false
) : View(context) {

    var tapEmptyToAdd: Boolean = overlayMode
    var onBoxesModified: ((List<NormalizedBox>) -> Unit)? = null

    private val boxes = mutableListOf<NormalizedBox>()
    private var activeIndex = -1
    private var resizing = false
    private var dragOffsetX = 0f
    private var dragOffsetY = 0f
    private var downNx = 0f
    private var downNy = 0f
    private var movedSinceDown = false
    private val tmpRect = RectF()

    private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (overlayMode) Color.parseColor("#18000000") else Color.parseColor("#152E28")
    }
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (overlayMode) Color.parseColor("#2AFFFFFF") else Color.parseColor("#24483F")
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }
    private val iconFill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (overlayMode) Color.parseColor("#441FBF96") else Color.parseColor("#552BB38E")
        style = Paint.Style.FILL
    }
    private val widgetFill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (overlayMode) Color.parseColor("#44F09A3E") else Color.parseColor("#55D9822B")
        style = Paint.Style.FILL
    }
    private val boxStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#E2FFF6")
        strokeWidth = 3f
        style = Paint.Style.STROKE
        pathEffect = DashPathEffect(floatArrayOf(14f, 8f), 0f)
    }
    private val handlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#FFFFFF")
        style = Paint.Style.FILL
    }
    private val handleRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#132A24")
        strokeWidth = 3f
        style = Paint.Style.STROKE
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 24f
        textAlign = Paint.Align.CENTER
        setShadowLayer(4f, 0f, 1f, Color.BLACK)
    }

    private val doubleTapDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onDoubleTap(e: MotionEvent): Boolean {
            val w = width.coerceAtLeast(1).toFloat()
            val h = height.coerceAtLeast(1).toFloat()
            val idx = IconLayoutMath.hitTestBox(boxes, e.x / w, e.y / h)
            if (idx >= 0) {
                boxes.removeAt(idx)
                activeIndex = -1
                resizing = false
                invalidate()
                onBoxesModified?.invoke(boxes.toList())
                return true
            }
            return false
        }
    })

    fun setBoxes(list: List<NormalizedBox>, notify: Boolean = false) {
        boxes.clear()
        boxes.addAll(list)
        activeIndex = -1
        resizing = false
        invalidate()
        if (notify) onBoxesModified?.invoke(boxes.toList())
    }

    fun getBoxes(): List<NormalizedBox> = boxes.toList()

    fun addBox(isWidget: Boolean, notify: Boolean = true) {
        val idx = boxes.size
        val shift = (idx % 6) * 0.04f
        val l = 0.28f + shift
        val t = 0.25f + shift
        val w = if (isWidget) 0.22f else 0.072f
        val h = if (isWidget) 0.18f else 0.115f
        boxes.add(NormalizedBox.clamped(l, t, l + w, t + h, isWidget = isWidget))
        invalidate()
        if (notify) onBoxesModified?.invoke(boxes.toList())
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (doubleTapDetector.onTouchEvent(event)) {
            activeIndex = -1
            resizing = false
            return true
        }
        val w = width.coerceAtLeast(1).toFloat()
        val h = height.coerceAtLeast(1).toFloat()
        val nx = (event.x / w).coerceIn(0f, 1f)
        val ny = (event.y / h).coerceIn(0f, 1f)
        val handleRx = (28f * resources.displayMetrics.density) / w
        val handleRy = (28f * resources.displayMetrics.density) / h

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downNx = nx
                downNy = ny
                movedSinceDown = false
                val resizeIdx = IconLayoutMath.hitTestResizeHandle(boxes, nx, ny, handleRx, handleRy)
                if (resizeIdx >= 0) {
                    activeIndex = resizeIdx
                    resizing = true
                    return true
                }
                val boxIdx = IconLayoutMath.hitTestBox(boxes, nx, ny)
                if (boxIdx >= 0) {
                    activeIndex = boxIdx
                    resizing = false
                    val b = boxes[boxIdx]
                    dragOffsetX = nx - b.left
                    dragOffsetY = ny - b.top
                } else {
                    activeIndex = -1
                    resizing = false
                }
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dist = kotlin.math.hypot((nx - downNx).toDouble(), (ny - downNy).toDouble())
                if (dist > 0.012) movedSinceDown = true
                if (activeIndex >= 0) {
                    val b = boxes[activeIndex]
                    boxes[activeIndex] = if (resizing) {
                        IconLayoutMath.resizeBox(b, nx, ny)
                    } else {
                        IconLayoutMath.moveBox(b, nx - dragOffsetX, ny - dragOffsetY)
                    }
                    invalidate()
                }
                return true
            }
            MotionEvent.ACTION_UP -> {
                if (activeIndex >= 0) {
                    onBoxesModified?.invoke(boxes.toList())
                } else if (!movedSinceDown && tapEmptyToAdd) {
                    boxes.add(IconLayoutMath.createBoxCenteredAt(nx, ny, isWidget = false))
                    invalidate()
                    onBoxesModified?.invoke(boxes.toList())
                }
                activeIndex = -1
                resizing = false
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                activeIndex = -1
                resizing = false
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (overlayMode) {
            canvas.drawRect(0f, 0f, w, h, bgPaint)
        } else {
            canvas.drawRoundRect(0f, 0f, w, h, 24f, 24f, bgPaint)
        }

        // Grid reference lines
        for (c in 1..5) {
            val x = w * c / 6f
            canvas.drawLine(x, 0f, x, h, gridPaint)
        }
        for (r in 1..3) {
            val y = h * r / 4f
            canvas.drawLine(0f, y, w, y, gridPaint)
        }

        val handleRadius = 8f * resources.displayMetrics.density
        for (b in boxes) {
            tmpRect.set(b.left * w, b.top * h, b.right * w, b.bottom * h)
            canvas.drawRoundRect(tmpRect, 18f, 18f, if (b.isWidget) widgetFill else iconFill)
            canvas.drawRoundRect(tmpRect, 18f, 18f, boxStroke)
            val label = if (b.isWidget) "Widget" else "App"
            canvas.drawText(label, tmpRect.centerX(), tmpRect.centerY() + 8f, labelPaint)
            // Bottom-right corner resize handle
            canvas.drawCircle(tmpRect.right, tmpRect.bottom, handleRadius, handlePaint)
            canvas.drawCircle(tmpRect.right, tmpRect.bottom, handleRadius, handleRingPaint)
        }
    }
}
