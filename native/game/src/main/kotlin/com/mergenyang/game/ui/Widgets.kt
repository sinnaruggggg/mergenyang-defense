package com.mergenyang.game.ui

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.g2d.Batch
import com.badlogic.gdx.scenes.scene2d.Actor
import com.badlogic.gdx.scenes.scene2d.Group
import com.badlogic.gdx.scenes.scene2d.InputEvent
import com.badlogic.gdx.scenes.scene2d.Touchable
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener
import com.badlogic.gdx.utils.Align
import com.mergenyang.game.Gfx
import kotlin.math.sin

/*
 * Scene2D 액터. 좌표는 기획 문서와 같은 좌상단 기준으로 배치하고(at),
 * 그리기는 Gfx로 한다. Gfx의 y 변환은 대칭이라 그룹 로컬 좌표에서도 그대로 맞는다.
 */

private fun Actor.topY() = Gfx.H - y - height

/** 좌상단 좌표로 배치 */
fun <T : Actor> Group.at(actor: T, x: Float, yTop: Float, w: Float, h: Float): T {
    actor.setBounds(x, Gfx.H - yTop - h, w, h)
    addActor(actor)
    return actor
}

class PanelActor(private val key: String, private val split: Int = 90, private val k: Float = 0.55f) : Actor() {
    init { touchable = Touchable.disabled }
    override fun draw(batch: Batch, parentAlpha: Float) =
        Gfx.nine(key, x, topY(), width, height, split, k, color.a * parentAlpha)
}

class ImgActor(var key: String, private val stretch: Boolean = false, var tint: Color = Color.WHITE) : Actor() {
    var bob = 0f
    init { touchable = Touchable.disabled }
    override fun draw(batch: Batch, parentAlpha: Float) {
        val b = if (bob > 0f) sin(System.nanoTime() / 2e8f) * bob else 0f
        if (stretch) Gfx.img(key, x, topY() + b, width, height, color.a * parentAlpha, tint)
        else Gfx.fit(key, x + width / 2, topY() + height / 2 + b, width, height, color.a * parentAlpha, tint)
    }
}

class TextActor(
    var text: () -> String,
    private val size: Float,
    var textColor: Color = Gfx.BROWN,
    private val align: Int = Align.center,
    private val outline: Boolean = false,
) : Actor() {
    constructor(s: String, size: Float, color: Color = Gfx.BROWN, align: Int = Align.center, outline: Boolean = false) :
        this({ s }, size, color, align, outline)

    init { touchable = Touchable.disabled }
    override fun draw(batch: Batch, parentAlpha: Float) {
        val tx = when (align) {
            Align.left -> x
            Align.right -> x + width
            else -> x + width / 2
        }
        Gfx.text(text(), tx, topY() + height / 2, size, textColor, align, outline, color.a * parentAlpha, maxW = width)
    }
}

/** 임의 그리기 */
class DrawActor(private val block: DrawActor.(alpha: Float) -> Unit) : Actor() {
    init { touchable = Touchable.disabled }
    override fun draw(batch: Batch, parentAlpha: Float) = block(color.a * parentAlpha)
}

/** 버튼: 원화 버튼 9-slice + 아이콘 + 글자, 누르면 살짝 줄어든다 */
class NyButton(
    var label: String,
    var colorName: String = "yellow",
    var sub: String? = null,
    var icon: String? = null,
    var textSize: Float = 0f,
    var iconSize: Float = 0f,
    var pulse: Boolean = false,
    var selected: Boolean = false,
    var onDisabled: (() -> Unit)? = null,
    private val onClick: () -> Unit,
) : Actor() {
    var disabled = false
    private val click = object : ClickListener() {
        override fun clicked(event: InputEvent, x: Float, y: Float) {
            if (disabled) onDisabled?.invoke() else {
                UiSound.click()
                onClick()
            }
        }
    }

    init { addListener(click) }

    override fun draw(batch: Batch, parentAlpha: Float) {
        val pressed = click.isPressed && !disabled
        var s = if (pressed) 0.95f else 1f
        if (pulse && !disabled) s *= 1f + sin(System.nanoTime() / 1.8e8f) * 0.025f
        val w = width * s
        val h = height * s
        val left = x + (width - w) / 2
        val top = Gfx.H - y - height + (height - h) / 2
        val state = when {
            disabled -> "disabled"
            pressed -> "pressed"
            selected -> "selected"
            else -> "normal"
        }
        Gfx.button(left, top, w, h, colorName, state)
        val a = color.a * parentAlpha
        val ts = if (textSize > 0) textSize * s else minOf(h * 0.32f, 44f * s)
        val cx = left + w / 2
        val cy = top + h / 2 - h * 0.035f
        var tx = cx
        val ic = icon
        if (ic != null) {
            val isz = if (iconSize > 0) iconSize * s else h * 0.5f
            val lw = if (label.isNotEmpty()) minOf(w - isz - 60f, label.length * ts) else 0f
            val ix = if (label.isNotEmpty()) cx - (isz + lw) / 2 - 6f else cx - isz / 2
            Gfx.fit(ic, ix + isz / 2, top + h / 2 - h * 0.03f, isz, isz, if (disabled) 0.5f * a else a)
            tx = ix + isz + 10f + lw / 2
        }
        val tc = if (disabled) DISABLED else Gfx.BROWN
        if (label.isNotEmpty()) {
            val maxW = w - 50f - if (ic != null) h * 0.5f else 0f
            val sb = sub
            Gfx.text(label, tx, cy + if (sb != null) -h * 0.12f else 0f, ts, tc, alpha = a, maxW = maxW)
            if (sb != null) Gfx.text(sb, tx, cy + h * 0.19f, ts * 0.72f, if (disabled) DISABLED else Gfx.SUB, alpha = a, maxW = w - 60f)
        }
    }

    companion object {
        val DISABLED: Color = Color.valueOf("9a8f84ff")
    }
}

/** 터치를 막는 반투명 막 (팝업 배경) */
class DimActor(private val alpha: Float = 0.6f, private val onTap: (() -> Unit)? = null) : Actor() {
    init {
        touchable = Touchable.enabled
        addListener(object : ClickListener() {
            override fun clicked(event: InputEvent, x: Float, y: Float) { onTap?.invoke() }
        })
    }
    override fun draw(batch: Batch, parentAlpha: Float) =
        Gfx.rect(x, Gfx.H - y - height, width, height, DIM, alpha * parentAlpha)

    companion object { val DIM: Color = Color.valueOf("1e0f0aff") }
}

/** 탭 영역 (보이지 않는 버튼) */
class HitActor(private val onTap: () -> Unit) : Actor() {
    init {
        touchable = Touchable.enabled
        addListener(object : ClickListener() {
            override fun clicked(event: InputEvent, x: Float, y: Float) = onTap()
        })
    }
}

object UiSound {
    var play: (String) -> Unit = {}
    fun click() = play("click")
}
