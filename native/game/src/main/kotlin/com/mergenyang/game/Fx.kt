package com.mergenyang.game

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.utils.Pool
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

fun rnd(a: Float, b: Float) = MathUtils.random(a, b)
fun easeOut(t: Float) = 1f - (1f - t).pow(3)
fun easeOutBack(t: Float): Float {
    val c = 1.70158f
    return 1f + (c + 1f) * (t - 1f).pow(3) + c * (t - 1f).pow(2)
}

/** 파티클 1개. 오브젝트 풀로 재사용해 GC 끊김을 막는다. */
class Particle : Pool.Poolable {
    var x = 0f; var y = 0f; var vx = 0f; var vy = 0f
    var g = 0f; var drag = 0.9f; var life = 0.6f; var t = 0f
    var size = 10f; val color = Color(Color.WHITE)
    var additive = true; var shrink = true; var grow = false; var fade = true
    var streak = false; var ui = false
    var img: String? = null; var rot = 0f; var vr = 0f
    var floor = Float.NaN
    // 목표로 빨려 들어가는 파티클
    var target = false; var tx = 0f; var ty = 0f; var delay = 0f; var flyTime = 0.4f; var curve = 0f
    var sx = Float.NaN; var sy = 0f; var arrived = false
    var onArrive: (() -> Unit)? = null

    override fun reset() {
        x = 0f; y = 0f; vx = 0f; vy = 0f; g = 0f; drag = 0.9f; life = 0.6f; t = 0f
        size = 10f; color.set(Color.WHITE); additive = true; shrink = true; grow = false; fade = true
        streak = false; ui = false; img = null; rot = 0f; vr = 0f; floor = Float.NaN
        target = false; delay = 0f; flyTime = 0.4f; curve = 0f; sx = Float.NaN; arrived = false; onArrive = null
    }
}

class FloatText(
    var x: Float, var y: Float, val s: String, val size: Float, val color: Color,
    val life: Float, var vy: Float, val glow: Boolean,
) { var t = 0f }

class SpriteFx(
    val key: String, val x: Float, val y: Float, val w: Float, val h: Float,
    val life: Float, val scale0: Float, val scale1: Float, val rot: Float, val additive: Boolean,
) { var t = 0f }

class RingFx(val x: Float, val y: Float, val color: Color, val maxR: Float, val life: Float, val width: Float) { var t = 0f }

class BoltFx(val xs: FloatArray, val ys: FloatArray, val color: Color, val life: Float) { var t = 0f }

/** 화면 흔들림, 섬광, 히트스톱, 슬로모션, 파티클, 떠오르는 숫자 */
class Fx {
    private val pool = object : Pool<Particle>(256, 1200) {
        override fun newObject() = Particle()
    }
    val parts = ArrayList<Particle>(512)
    val texts = ArrayList<FloatText>()
    val sprites = ArrayList<SpriteFx>()
    val rings = ArrayList<RingFx>()
    val bolts = ArrayList<BoltFx>()

    var shakeAmt = 0f
    val flashColor = Color(Color.WHITE)
    var flashA = 0f
    var hitstop = 0f
    var slowT = 0f
    var slowScale = 1f
    var zoomT = 0f
    var zoomX = 540f
    var zoomY = 500f

    fun clear() {
        parts.forEach { pool.free(it) }
        parts.clear(); texts.clear(); sprites.clear(); rings.clear(); bolts.clear()
        shakeAmt = 0f; flashA = 0f; hitstop = 0f; slowT = 0f; zoomT = 0f
    }

    fun shake(a: Float) { shakeAmt = max(shakeAmt, a) }
    fun flash(c: Color, a: Float = 0.6f) { flashColor.set(c); flashA = max(flashA, a) }
    fun stop(t: Float) { hitstop = max(hitstop, t) }
    fun slow(t: Float, s: Float = 0.25f) { slowT = t; slowScale = s }
    fun punch(x: Float, y: Float, t: Float = 0.35f) { zoomT = t; zoomX = x; zoomY = y }
    fun timeScale() = if (slowT > 0f) slowScale else 1f

    fun p(init: Particle.() -> Unit): Particle {
        if (parts.size > 900) pool.free(parts.removeAt(0))
        val p = pool.obtain()
        p.init()
        parts += p
        return p
    }

    fun burst(x: Float, y: Float, c: Color, n: Int = 16, speed: Float = 600f, size: Float = 12f, life: Float = 0.5f) {
        repeat(n) {
            val a = rnd(0f, 2 * PI.toFloat())
            val s = rnd(0.3f, 1f) * speed
            p {
                this.x = x; this.y = y; vx = cos(a) * s; vy = sin(a) * s
                this.size = rnd(0.5f, 1f) * size; color.set(c); this.life = rnd(0.6f, 1f) * life; drag = 0.88f
            }
        }
    }

    fun sparks(x: Float, y: Float, c: Color, n: Int = 10, dir: Float = 0f, spread: Float = PI.toFloat()) {
        repeat(n) {
            val a = dir + rnd(-spread / 2, spread / 2)
            val s = rnd(400f, 1100f)
            p {
                this.x = x; this.y = y; vx = cos(a) * s; vy = sin(a) * s
                size = rnd(3f, 6f); color.set(c); life = rnd(0.2f, 0.45f); streak = true; g = 1400f; drag = 0.93f
            }
        }
    }

    fun stars(x: Float, y: Float, n: Int = 8, spread: Float = 300f, size: Float = 40f, ui: Boolean = false) {
        repeat(n) {
            val a = rnd(0f, 2 * PI.toFloat())
            val s = rnd(0.4f, 1f) * spread
            p {
                this.x = x; this.y = y; vx = cos(a) * s; vy = sin(a) * s - 200f; g = 600f
                img = "icons/star"; this.size = rnd(0.5f, 1f) * size; life = rnd(0.5f, 0.9f)
                vr = rnd(-400f, 400f); additive = false; this.ui = ui
            }
        }
    }

    fun smoke(x: Float, y: Float, n: Int = 6, c: Color = SMOKE) {
        repeat(n) {
            p {
                this.x = x + rnd(-30f, 30f); this.y = y + rnd(-10f, 10f); vx = rnd(-120f, 120f); vy = rnd(-160f, -40f)
                size = rnd(14f, 28f); color.set(c); life = rnd(0.4f, 0.8f); additive = false; grow = true; drag = 0.92f
            }
        }
    }

    fun ring(x: Float, y: Float, c: Color, maxR: Float = 250f, life: Float = 0.45f, width: Float = 18f) {
        rings += RingFx(x, y, Color(c), maxR, life, width)
    }

    fun bolt(x1: Float, y1: Float, x2: Float, y2: Float, c: Color, life: Float = 0.25f) {
        val n = 10
        val xs = FloatArray(n + 1)
        val ys = FloatArray(n + 1)
        for (i in 0..n) {
            val t = i / n.toFloat()
            val jitter = i in 1 until n
            xs[i] = x1 + (x2 - x1) * t + if (jitter) rnd(-40f, 40f) else 0f
            ys[i] = y1 + (y2 - y1) * t + if (jitter) rnd(-20f, 20f) else 0f
        }
        bolts += BoltFx(xs, ys, Color(c), life)
    }

    fun sprite(key: String, x: Float, y: Float, w: Float, h: Float, life: Float = 0.35f, scale0: Float = 0.6f, scale1: Float = 1.15f, rot: Float = 0f, additive: Boolean = false) {
        sprites += SpriteFx(key, x, y, w, h, life, scale0, scale1, rot, additive)
    }

    fun number(x: Float, y: Float, s: String, size: Float = 44f, color: Color = Color.WHITE, life: Float = 0.9f, vy: Float = -260f, glow: Boolean = false) {
        if (texts.size > 80) texts.removeAt(0)
        texts += FloatText(x + rnd(-25f, 25f), y, s, size, Color(color), life, vy, glow)
    }

    /** 골드·보석이 목표(HUD)로 빨려 들어감 */
    fun collect(x: Float, y: Float, key: String, tx: Float, ty: Float, n: Int, ui: Boolean, onEach: () -> Unit) {
        repeat(n) {
            val a = rnd(0f, 2 * PI.toFloat())
            val s = rnd(200f, 650f)
            p {
                this.x = x; this.y = y; vx = cos(a) * s; vy = sin(a) * s - 300f; g = 1500f; drag = 0.9f
                img = key; size = rnd(38f, 52f); life = 5f; additive = false; shrink = false; fade = false
                target = true; this.tx = tx; this.ty = ty; delay = rnd(0.35f, 0.7f); flyTime = rnd(0.35f, 0.55f)
                curve = rnd(-120f, 120f); onArrive = onEach; this.ui = ui; vr = rnd(-300f, 300f)
            }
        }
    }

    fun update(dt: Float) {
        shakeAmt = max(0f, shakeAmt - dt * 60f)
        flashA = max(0f, flashA - dt * 2.5f)
        if (slowT > 0f) slowT -= dt
        if (zoomT > 0f) zoomT -= dt
        val it = parts.iterator()
        while (it.hasNext()) {
            val p = it.next()
            p.t += dt
            val d = p.drag.pow(dt * 60f)
            p.vx *= d; p.vy *= d
            p.vy += p.g * dt
            if (p.target && p.t > p.delay) {
                if (p.sx.isNaN()) { p.sx = p.x; p.sy = p.y }
                val k = min(1f, (p.t - p.delay) / p.flyTime)
                val e = k * k
                p.x = p.sx + (p.tx - p.sx) * e + sin(k * PI.toFloat()) * p.curve
                p.y = p.sy + (p.ty - p.sy) * e
                if (k >= 1f && !p.arrived) {
                    p.arrived = true
                    p.onArrive?.invoke()
                    p.t = p.life
                }
            } else {
                p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt
                if (!p.floor.isNaN() && p.y > p.floor) { p.y = p.floor; p.vy *= -0.45f; p.vx *= 0.7f }
            }
            if (p.t >= p.life) {
                it.remove()
                pool.free(p)
            }
        }
        texts.forEach { t -> t.t += dt; t.y += t.vy * dt; t.vy *= 0.9f.pow(dt * 60f) }
        texts.removeAll { t -> t.t >= t.life }
        sprites.forEach { s -> s.t += dt }
        sprites.removeAll { s -> s.t >= s.life }
        rings.forEach { r -> r.t += dt }
        rings.removeAll { r -> r.t >= r.life }
        bolts.forEach { b -> b.t += dt }
        bolts.removeAll { b -> b.t >= b.life }
    }

    fun drawWorld() {
        val b = Gfx.batch
        for (s in sprites) {
            val k = s.t / s.life
            val sc = s.scale0 + (s.scale1 - s.scale0) * easeOut(k)
            val a = if (k < 0.2f) k / 0.2f else 1f - (k - 0.2f) / 0.8f
            val r = Gfx.assets.region(s.key) ?: continue
            val w = s.w * sc
            val h = s.h * sc
            val draw = {
                b.setColor(1f, 1f, 1f, a)
                b.draw(r, s.x - w / 2, Gfx.H - s.y - h / 2, w / 2, h / 2, w, h, 1f, 1f, s.rot)
                b.setColor(Color.WHITE)
            }
            if (s.additive) Gfx.additive(draw) else draw()
        }
        Gfx.additive {
            for (r in rings) {
                val k = r.t / r.life
                Gfx.ring(r.x, r.y, r.maxR * easeOut(k) + 4f, r.color, (1f - k) * min(1f, r.width / 12f))
            }
            for (bo in bolts) {
                val a = 1f - bo.t / bo.life
                for (i in 0 until bo.xs.size - 1) {
                    Gfx.line(bo.xs[i], bo.ys[i], bo.xs[i + 1], bo.ys[i + 1], 26f, bo.color, a * 0.7f)
                    Gfx.line(bo.xs[i], bo.ys[i], bo.xs[i + 1], bo.ys[i + 1], 8f, Color.WHITE, a)
                }
            }
        }
        drawParts(false)
    }

    fun drawParts(ui: Boolean) {
        val b = Gfx.batch
        for (p in parts) {
            if (p.ui != ui) continue
            val k = p.t / p.life
            val a = if (!p.fade) 1f else if (k > 0.6f) 1f - (k - 0.6f) / 0.4f else 1f
            val size = when {
                p.grow -> p.size * (1f + k * 1.5f)
                p.shrink -> p.size * (1f - k * 0.7f)
                else -> p.size
            }
            val img = p.img
            if (img != null) {
                val r = Gfx.assets.region(img) ?: continue
                b.setColor(1f, 1f, 1f, a)
                b.draw(r, p.x - size / 2, Gfx.H - p.y - size / 2, size / 2, size / 2, size, size, 1f, 1f, p.rot)
                b.setColor(Color.WHITE)
            } else if (p.streak) {
                if (p.additive) Gfx.additive { Gfx.line(p.x, p.y, p.x - p.vx * 0.04f, p.y - p.vy * 0.04f, size, p.color, a) }
                else Gfx.line(p.x, p.y, p.x - p.vx * 0.04f, p.y - p.vy * 0.04f, size, p.color, a)
            } else {
                if (p.additive) Gfx.additive { Gfx.dot(p.x, p.y, size * 1.3f, p.color, a) }
                else Gfx.dot(p.x, p.y, size * 1.3f, p.color, a * p.color.a)
            }
        }
    }

    fun drawTexts() {
        for (t in texts) {
            val k = t.t / t.life
            val pop = if (t.t < 0.12f) 1.8f + (1f - 1.8f) * (t.t / 0.12f) else 1f
            val a = if (k > 0.7f) 1f - (k - 0.7f) / 0.3f else 1f
            if (t.glow) Gfx.additive { Gfx.glow(t.x, t.y, t.size * 1.3f, ORANGE, a * 0.5f) }
            Gfx.text(t.s, t.x, t.y, t.size, t.color, outline = true, alpha = a, scale = pop)
        }
    }

    fun drawOverlay() {
        if (flashA > 0f) Gfx.fullRect(flashColor, flashA)
    }

    /** 흔들림·줌을 카메라 오프셋으로 */
    fun cameraOffset(out: FloatArray) {
        out[0] = if (shakeAmt > 0) rnd(-1f, 1f) * shakeAmt else 0f
        out[1] = if (shakeAmt > 0) rnd(-1f, 1f) * shakeAmt else 0f
        out[2] = if (zoomT > 0f) 1f + 0.06f * sin((zoomT / 0.35f) * PI.toFloat()) else 1f
    }

    companion object {
        val SMOKE = Color(0.94f, 0.88f, 0.8f, 0.45f)
        val ORANGE: Color = Color.valueOf("ff8a00ff")
    }
}
