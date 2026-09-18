package com.mergenyang.game

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.g2d.Batch
import com.badlogic.gdx.graphics.g2d.GlyphLayout
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.graphics.g2d.TextureRegion
import com.badlogic.gdx.graphics.glutils.ShaderProgram
import com.badlogic.gdx.utils.Align
import com.mergenyang.core.Line
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.min

/**
 * 좌상단 원점(웹 기획 좌표, 1080x1920) 그리기 도우미.
 * libGDX는 좌하단 원점이므로 y를 여기서 뒤집는다.
 */
object Gfx {
    const val W = 1080f
    const val H = 1920f

    lateinit var batch: Batch
    lateinit var assets: Assets
    private val layout = GlyphLayout()
    private val tmp = Color()
    private var grayShader: ShaderProgram? = null

    val FONT_SIZES = intArrayOf(24, 32, 40, 52, 64, 80, 110)

    fun lineColor(line: Line): Color = LINE_COLORS.getValue(line)
    private val LINE_COLORS = mapOf(
        Line.weapon to Color.valueOf("ff8a4cff"),
        Line.armor to Color.valueOf("6fa8ffff"),
        Line.consumable to Color.valueOf("5fd18bff"),
        Line.special to Color.valueOf("d78bffff"),
    )

    fun color(hex: String): Color = Color.valueOf(hex)

    // ---------- 긴 화면 ----------
    /** 세로가 9:16보다 긴 기기에서 기준 1920 위·아래로 더 보이는 높이 (한쪽 몫, 논리 px) */
    var ext = 0f
    /** 노치 등 상단 안전영역 (논리 px) */
    var safeTop = 0f
    /** 화면 맨 위·맨 아래의 논리 y */
    val top get() = -ext
    val bottom get() = H + ext
    /** 9:21 원화 범위를 넘는 기기에서만 균등 확대한다. */
    val coverK get() = maxOf(1f, (H + ext * 2f) / 2520f)
    fun coverX(x: Float) = W / 2f + (x - W / 2f) * coverK
    fun coverY(y: Float) = H / 2f + (y - H / 2f) * coverK

    private val shiftMat = com.badlogic.gdx.math.Matrix4()
    private val savedMat = com.badlogic.gdx.math.Matrix4()

    /** 그리기를 세로로 dy만큼 옮긴다 (좌상단 기준, 음수면 위로). 상단 HUD를 화면 맨 위에 붙일 때 쓴다 */
    fun shifted(dy: Float, block: () -> Unit) {
        if (dy == 0f) return block()
        savedMat.set(batch.transformMatrix)
        batch.transformMatrix = shiftMat.set(savedMat).translate(0f, -dy, 0f)
        try {
            block()
        } finally {
            batch.transformMatrix = savedMat
        }
    }

    /** 보이는 화면 전체를 덮는 사각형 (암전·팝업 막) */
    fun fullRect(c: Color, alpha: Float = 1f) = rect(0f, -ext, W, H + ext * 2f, c, alpha)

    /** 확장된 화면 전체를 비율 유지로 채운다 (좌우는 잘림) */
    fun cover(key: String) {
        background(key)
    }

    /** 긴 원화는 폭 기준으로 표시하고, 기기 높이만큼 위아래가 더 보이게 한다. */
    fun background(key: String) {
        val r = assets.region(key) ?: return
        // 새 전투 원화의 돌바닥(높이 32.6%)을 캐릭터 접지선 640에 맞춘다.
        // 배경만 균등 확대하며 보드/캐릭터/레일의 게임 좌표는 유지한다.
        if (key == "bg/battle") {
            val ground = 640f
            val anchor = r.regionHeight * 0.326f
            val s = maxOf(W / r.regionWidth, (ground + ext) / anchor,
                (H + ext - ground) / (r.regionHeight - anchor))
            drawRegion(r, (W - r.regionWidth * s) / 2f, ground - anchor * s,
                r.regionWidth * s, r.regionHeight * s)
            return
        }
        val scale = maxOf(W / r.regionWidth, (H + ext * 2f) / r.regionHeight)
        val w = r.regionWidth * scale
        val h = r.regionHeight * scale
        drawRegion(r, (W - w) / 2f, (H - h) / 2f, w, h)
    }


    private fun setColor(c: Color, alpha: Float) {
        batch.setColor(c.r, c.g, c.b, c.a * alpha)
    }

    fun rect(x: Float, y: Float, w: Float, h: Float, c: Color, alpha: Float = 1f) {
        setColor(c, alpha)
        batch.draw(assets.white, x, H - y - h, w, h)
        batch.setColor(Color.WHITE)
    }

    fun img(key: String, x: Float, y: Float, w: Float, h: Float, alpha: Float = 1f, tint: Color = Color.WHITE) {
        val r = assets.region(key) ?: return
        drawRegion(r, x, y, w, h, alpha, tint)
    }

    /** 아틀라스 여백 제거 오프셋을 고려해 원래 크기 박스에 그린다 */
    fun drawRegion(r: TextureRegion, x: Float, y: Float, w: Float, h: Float, alpha: Float = 1f, tint: Color = Color.WHITE) {
        setColor(tint, alpha)
        if (r is TextureAtlas.AtlasRegion && (r.packedWidth != r.originalWidth || r.packedHeight != r.originalHeight)) {
            val sx = w / r.originalWidth
            val sy = h / r.originalHeight
            val left = x + r.offsetX * sx
            val bottom = (H - y - h) + r.offsetY * sy
            batch.draw(r, left, bottom, r.packedWidth * sx, r.packedHeight * sy)
        } else {
            batch.draw(r, x, H - y - h, w, h)
        }
        batch.setColor(Color.WHITE)
    }

    fun size(key: String): Pair<Float, Float> {
        val r = assets.region(key) ?: return 1f to 1f
        return if (r is TextureAtlas.AtlasRegion) r.originalWidth.toFloat() to r.originalHeight.toFloat()
        else r.regionWidth.toFloat() to r.regionHeight.toFloat()
    }

    /** 비율 유지하며 (cx,cy) 중심 박스에 맞춤 */
    fun fit(key: String, cx: Float, cy: Float, maxW: Float, maxH: Float, alpha: Float = 1f, tint: Color = Color.WHITE, scale: Float = 1f, rotation: Float = 0f) {
        val r = assets.region(key) ?: return
        val (iw, ih) = size(key)
        val s = min(maxW / iw, maxH / ih) * scale
        if (rotation == 0f) {
            drawRegion(r, cx - iw * s / 2, cy - ih * s / 2, iw * s, ih * s, alpha, tint)
        } else {
            setColor(tint, alpha)
            val w = r.regionWidth * s
            val h = r.regionHeight * s
            batch.draw(r, cx - w / 2, H - cy - h / 2, w / 2, h / 2, w, h, 1f, 1f, rotation)
            batch.setColor(Color.WHITE)
        }
    }

    fun item(line: Line, tier: Int, cx: Float, cy: Float, scale: Float = 1f, alpha: Float = 1f) =
        fit("items/${line.name}-$tier", cx, cy, 112f * scale, 84f * scale, alpha)

    fun chest(cx: Float, cy: Float, scale: Float = 1f, alpha: Float = 1f, rotation: Float = 0f) =
        fit("icons/chest", cx, cy, 96f * scale, 86f * scale, alpha, rotation = rotation)

    /** 9-slice 패널: split=원본 가장자리, k=가장자리 확대 비율 */
    fun nine(key: String, x: Float, y: Float, w: Float, h: Float, split: Int = 90, k: Float = 0.55f, alpha: Float = 1f, tint: Color = Color.WHITE) {
        if (w <= 1 || h <= 1) return
        val kk = min(k, min(w / (2f * split), h / (2f * split)))
        val np = assets.patch(key, split, kk) ?: return
        setColor(tint, alpha)
        np.draw(batch, x, H - y - h, w, h)
        batch.setColor(Color.WHITE)
    }

    fun panel(x: Float, y: Float, w: Float, h: Float, color: String = "cream", alpha: Float = 1f) =
        nine("ui/panel-$color", x, y, w, h, 90, 0.55f, alpha)

    fun button(x: Float, y: Float, w: Float, h: Float, color: String, state: String) =
        nine("ui/button-$color-$state", x, y, w, h, 58, min(1f, h / 134f * 1.05f))

    fun bar(x: Float, y: Float, w: Float, h: Float, ratio: Float, fill: String) {
        nine("ui/progress-track", x, y, w, h, 60, h / 138f * 1.2f)
        val r = ratio.coerceIn(0f, 1f)
        if (r <= 0f) return
        val pad = h * 0.16f
        batch.flush()
        val clip = com.badlogic.gdx.math.Rectangle(x + pad, H - y - h, (w - pad * 2) * r, h)
        val scissor = com.badlogic.gdx.math.Rectangle()
        val vp = Screens.viewport
        com.badlogic.gdx.scenes.scene2d.utils.ScissorStack.calculateScissors(
            vp.camera, vp.screenX.toFloat(), vp.screenY.toFloat(), vp.screenWidth.toFloat(), vp.screenHeight.toFloat(),
            batch.transformMatrix, clip, scissor,
        )
        if (com.badlogic.gdx.scenes.scene2d.utils.ScissorStack.pushScissors(scissor)) {
            nine(fill, x + pad, y + pad, w - pad * 2, h - pad * 2, 45, (h - pad * 2) / 99f * 1.2f)
            batch.flush()
            com.badlogic.gdx.scenes.scene2d.utils.ScissorStack.popScissors()
        }
    }

    // ---------- 글자 ----------
    fun text(
        s: String, x: Float, y: Float, size: Float, color: Color = BROWN, align: Int = Align.center,
        outline: Boolean = false, alpha: Float = 1f, maxW: Float = 0f, scale: Float = 1f,
    ) {
        if (s.isEmpty() || size * scale < 1f || alpha <= 0.01f) return
        val gen = FONT_SIZES.firstOrNull { it >= size } ?: FONT_SIZES.last()
        val font = assets.font(gen, outline)
        var fs = size / gen * scale
        font.data.setScale(fs)
        layout.setText(font, s)
        if (maxW > 0 && layout.width > maxW * scale) {
            fs *= maxW * scale / layout.width
            font.data.setScale(fs)
            layout.setText(font, s)
        }
        tmp.set(color).a *= alpha
        font.color = tmp
        val left = when (align) {
            Align.left -> x
            Align.right -> x - layout.width
            else -> x - layout.width / 2
        }
        // y는 글자 세로 중심
        font.draw(batch, s, left, H - y + layout.height / 2)
        font.data.setScale(1f)
        font.color = Color.WHITE
    }

    // ---------- 캐릭터 프레임 (512 캔버스, 피벗 256,472) ----------
    fun frame(
        key: String, x: Float, feetY: Float, s: Float,
        flip: Boolean = false, sx: Float = 1f, sy: Float = 1f, alpha: Float = 1f, flash: Float = 0f, gray: Boolean = false,
        tint: Color = Color.WHITE,
    ) {
        val r = assets.region(key) as? TextureAtlas.AtlasRegion ?: return
        val scaleX = s * sx
        val scaleY = s * sy
        val yUp = H - feetY
        val bottom = yUp + (r.offsetY - 40f) * scaleY
        val w = r.packedWidth * scaleX
        val h = r.packedHeight * scaleY
        val left = if (!flip) x + (r.offsetX - 256f) * scaleX else x + (256f - r.offsetX) * scaleX
        val dw = if (flip) -w else w
        if (gray) useGray(true)
        setColor(tint, alpha)
        batch.draw(r, left, bottom, dw, h)
        if (gray) useGray(false)
        if (flash > 0f) {
            additive {
                batch.setColor(1f, 1f, 1f, min(1f, flash) * alpha)
                batch.draw(r, left, bottom, dw, h)
            }
        }
        batch.setColor(Color.WHITE)
    }

    private fun useGray(on: Boolean) {
        if (grayShader == null) {
            grayShader = ShaderProgram(GRAY_VERT, GRAY_FRAG).also {
                require(it.isCompiled) { it.log }
            }
        }
        batch.shader = if (on) grayShader else null
    }

    inline fun additive(block: () -> Unit) {
        batch.setBlendFunction(GL20.GL_SRC_ALPHA, GL20.GL_ONE)
        block()
        batch.setBlendFunction(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA)
    }

    fun glow(cx: Float, cy: Float, radius: Float, c: Color, alpha: Float = 1f) {
        setColor(c, alpha)
        batch.draw(assets.glow, cx - radius, H - cy - radius, radius * 2, radius * 2)
        batch.setColor(Color.WHITE)
    }

    fun dot(cx: Float, cy: Float, radius: Float, c: Color, alpha: Float = 1f) {
        setColor(c, alpha)
        batch.draw(assets.dot, cx - radius, H - cy - radius, radius * 2, radius * 2)
        batch.setColor(Color.WHITE)
    }

    fun ring(cx: Float, cy: Float, radius: Float, c: Color, alpha: Float = 1f) {
        setColor(c, alpha)
        batch.draw(assets.ring, cx - radius, H - cy - radius, radius * 2, radius * 2)
        batch.setColor(Color.WHITE)
    }

    fun line(x1: Float, y1: Float, x2: Float, y2: Float, width: Float, c: Color, alpha: Float = 1f) {
        val len = hypot(x2 - x1, y2 - y1)
        if (len < 0.5f) return
        val ang = Math.toDegrees(atan2(-(y2 - y1), x2 - x1).toDouble()).toFloat()
        setColor(c, alpha)
        batch.draw(assets.white, x1, H - y1 - width / 2, 0f, width / 2, len, width, 1f, 1f, ang)
        batch.setColor(Color.WHITE)
    }

    val BROWN: Color = Color.valueOf("5a3a22ff")
    val SUB: Color = Color.valueOf("7a5636ff")
    val MUTED: Color = Color.valueOf("8a6a4aff")
    val GOLD: Color = Color.valueOf("ffe27aff")
    val MINT: Color = Color.valueOf("7affc1ff")
    val RED: Color = Color.valueOf("ff5a4aff")

    private const val GRAY_VERT = """
attribute vec4 ${ShaderProgram.POSITION_ATTRIBUTE};
attribute vec4 ${ShaderProgram.COLOR_ATTRIBUTE};
attribute vec2 ${ShaderProgram.TEXCOORD_ATTRIBUTE}0;
uniform mat4 u_projTrans;
varying vec4 v_color;
varying vec2 v_texCoords;
void main() {
    v_color = ${ShaderProgram.COLOR_ATTRIBUTE};
    v_color.a = v_color.a * (255.0/254.0);
    v_texCoords = ${ShaderProgram.TEXCOORD_ATTRIBUTE}0;
    gl_Position = u_projTrans * ${ShaderProgram.POSITION_ATTRIBUTE};
}
"""
    private const val GRAY_FRAG = """
#ifdef GL_ES
precision mediump float;
#endif
varying vec4 v_color;
varying vec2 v_texCoords;
uniform sampler2D u_texture;
void main() {
    vec4 c = texture2D(u_texture, v_texCoords);
    float g = dot(c.rgb, vec3(0.299, 0.587, 0.114)) * 0.9;
    gl_FragColor = vec4(g, g, g, c.a) * v_color;
}
"""
}
