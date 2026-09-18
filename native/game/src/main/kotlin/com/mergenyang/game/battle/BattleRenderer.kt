package com.mergenyang.game.battle

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.utils.Align
import com.mergenyang.core.BoardItem
import com.mergenyang.core.Line
import com.mergenyang.core.Mode
import com.mergenyang.game.Chars
import com.mergenyang.game.Gfx
import com.mergenyang.game.easeOut
import com.mergenyang.game.easeOutBack
import com.mergenyang.game.screens.shortNum
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/** 전투 화면 그리기 (좌상단 좌표) */
class BattleRenderer(private val b: Battle) {
    private val fx get() = b.fx

    fun drawWorld(t: Float) {
        Gfx.background("bg/battle")
        val boss = b.boss
        if (boss != null && !boss.dead && !boss.world) Gfx.rect(0f, Gfx.top, Gfx.W, 690f - Gfx.top, BOSS_TINT, 0.18f)
        for (c in b.cats) Chars.shadow(c.x, c.y, 220f)
        for (e in b.foes) if (!e.fly) Chars.shadow(e.x, Layout.GROUND, 300f * e.scale, if (e.dead) 0.3f else 0.7f)
        for (e in b.foes.sortedByDescending { it.x }) drawFoe(e, t)
        for (c in b.cats) drawCat(c, t)
        for (p in b.projectiles) drawProjectile(p)
    }

    private fun drawProjectile(p: Projectile) {
        if (p.done) return
        if (p.kind == ProjKind.ARROW) {
            val cx = kotlin.math.cos(p.ang)
            val cy = kotlin.math.sin(p.ang)
            Gfx.additive { Gfx.line(p.x - cx * 120f, p.y - cy * 120f, p.x - cx * 40f, p.y - cy * 40f, 10f, ARROW_TRAIL, 0.6f) }
            Gfx.line(p.x - cx * 50f, p.y - cy * 50f, p.x + cx * 20f, p.y + cy * 20f, 6f, ARROW_SHAFT)
            Gfx.line(p.x + cx * 14f, p.y + cy * 14f, p.x + cx * 34f, p.y + cy * 34f, 10f, ARROW_HEAD)
        } else {
            val r = if (p.kind == ProjKind.FIRE) 30f else 20f
            Gfx.additive {
                Gfx.glow(p.x, p.y, r * 1.8f, p.color)
                Gfx.glow(p.x, p.y, r * 0.8f, Color.WHITE)
            }
        }
    }

    private fun drawCat(c: CatUnit, t: Float) {
        val sq = if (c.sq > 0f) sin(c.sq / 0.12f * PI.toFloat()) * 0.08f else 0f
        val x = c.x + c.lunge
        if (c.rageT > 0f || b.feverT > 0f) {
            Gfx.additive { Gfx.glow(x, c.y - 120f, 190f, if (b.feverT > 0f) FEVER_GLOW else RAGE_GLOW, 0.55f) }
        }
        val alpha = if (c.isDown) 0.55f else 1f
        val s = 0.6f
        if (c.state == CatState.ATTACK) {
            Chars.catAttack(c.id, if (c.struck) 1 else 0, x, c.y, s, sx = 1 + sq, sy = 1 - sq, alpha = alpha, flash = c.flash, gray = c.isDown)
        } else {
            Chars.idle(c.id, x, c.y, s, t, c.bob, sx = 1 + sq, sy = 1 - sq, alpha = alpha, flash = c.flash, gray = c.isDown)
        }
        if (c.poisonT > 0f && !c.isDown) Gfx.glow(x, c.y - 110f, 130f, POISON_TINT, 0.35f)
        val bw = 170f
        val by = c.y - 245f
        Gfx.bar(x - bw / 2, by, bw, 30f, c.hp / c.maxHp, if (c.hp / c.maxHp > 0.35f) "ui/progress-mint" else "ui/progress-red")
        var ix = x - bw / 2 + 20f
        if (c.weapon > 0) { Gfx.item(Line.weapon, c.weapon, ix, by - 26f, 0.45f); ix += 48f }
        if (c.armor > 0) { Gfx.item(Line.armor, c.armor, ix, by - 26f, 0.45f); ix += 48f }
        if (c.buffT > 0f) Gfx.fit("icons/sword", ix, by - 26f, 36f, 36f, 0.6f + 0.4f * sin(t * 10f))
        if (c.shockT > 0f) Gfx.fit("icons/energy", x + bw / 2 - 10f, by - 26f, 36f, 36f)
        if (c.isDown) {
            Gfx.text("${kotlin.math.ceil(c.down).toInt()}", x, c.y - 140f, 72f, Color.WHITE, outline = true)
            Gfx.text("소모품으로 부활!", x, c.y - 70f, 26f, Color.WHITE, outline = true)
        }
        val d = b.drag
        if (d != null && d.moved && !d.item.chest && d.item.line != Line.special && d.y < Layout.RAIL_Y && b.catAt(d.x, d.y) === c) {
            Gfx.additive { Gfx.ring(x, c.y - 120f, 150f + sin(t * 10f) * 6f, Gfx.lineColor(d.item.line), 0.9f) }
        }
    }

    private fun drawFoe(e: Foe, t: Float) {
        val frame = if (e.state == FoeState.ATTACK && e.struck) 1 else 0
        var y = e.y
        var sx = 1f
        var sy = 1f
        var alpha = 1f
        if (e.state == FoeState.WALK || e.state == FoeState.ENTER) {
            val ph = t * 10f + e.bob
            y -= abs(sin(ph)) * 14f
            sy = 1f + sin(ph * 2) * 0.03f
        } else {
            sy = 1f + sin(t * 4f + e.bob) * 0.02f
        }
        if (e.fly) y += sin(t * 3f + e.bob) * 16f
        if (e.spawnT > 0f) { val k = 1f - e.spawnT / 0.3f; sx *= k; sy *= k }
        if (e.dead) { val k = min(1f, e.deadT / 0.5f); alpha = 1f - k; sy *= 1f - k * 0.5f; sx *= 1f + k * 0.3f }
        if (e.flash > 0.5f) { sx *= 1.05f; sy *= 0.94f }
        val lunge = if (e.state == FoeState.ATTACK && e.struck) -25f else 0f
        if (e.isBoss && e.rageT > 0f) Gfx.additive { Gfx.glow(e.x, y - 200f, 330f, RAGE_RED, 0.5f) }
        if (e.state == FoeState.WALK && !e.dead) Chars.walk(e.atkId, e.x, y, e.scale, t, e.bob, sx, sy, alpha, e.flash)
        else Chars.foe(e.atkId, frame, e.x + lunge, y, e.scale, sx, sy, alpha, e.flash)
        if (e.dead) return
        if (e.isBoss && e.shieldHp > 0) {
            Gfx.additive {
                val a = 0.35f + 0.15f * sin(t * 6f)
                Gfx.glow(e.x, y - 200f * e.scale, 260f * e.scale, SHIELD, a * 0.5f)
                Gfx.ring(e.x, y - 200f * e.scale, 250f * e.scale, SHIELD, a)
            }
        }
        if (e.shield && !e.isBoss) Gfx.additive { Gfx.ring(e.x, y - 190f * e.scale, 240f * e.scale, SHIELD, 0.35f) }
        val riddle = e.riddle
        if (e.isBoss && riddle != null) {
            val bob = sin(t * 5f) * 8f
            Gfx.panel(e.x - 70f, y - 480f * e.scale - 90f + bob, 140f, 120f, "lavender")
            Gfx.item(riddle, 1, e.x, y - 480f * e.scale - 30f + bob, 0.8f)
        }
        if (e.isBoss && e.stun > 0f) Gfx.text("기절!", e.x, y - 420f * e.scale, 44f, Gfx.GOLD, outline = true)
        if (!e.isBoss && !e.elite && e.hp < e.maxHp) {
            val bw = 110f * max(1f, e.scale * 1.6f)
            Gfx.bar(e.x - bw / 2, y - 250f * e.scale - 20f, bw, 22f, (e.hp / e.maxHp).toFloat(), "ui/progress-red")
        }
        if (b.emergency?.boss === e) {
            Gfx.text("!", e.x, y - 470f * e.scale, 130f, if (sin(t * 20f) > 0) RAGE_RED else Gfx.GOLD, outline = true)
        }
    }

    fun drawRail(t: Float) {
        val em = b.emergency
        Gfx.fitRail()
        // 흐르는 화살표 빛
        Gfx.additive {
            val off = (t * (if (b.railSpeed < 1000f) 120f else 300f)) % 180f
            var x = Layout.RAIL_X0 - 180f + off
            while (x < Layout.RAIL_X1 - 50f) {
                val left = max(x, Layout.RAIL_X0)
                val right = min(x + 120f, Layout.RAIL_X1 - 50f)
                if (right > left) {
                    val steps = 6
                    for (i in 0 until steps) {
                        val a = (i + 1f) / steps * 0.35f
                        val sx = left + (right - left) * i / steps
                        Gfx.rect(sx, Layout.RAIL_Y + 58f, (right - left) / steps + 1f, 42f, if (em != null) EM_RED else RAIL_GREEN, a)
                    }
                }
                x += 180f
            }
        }
        if (em != null) {
            val a = 0.35f + 0.35f * sin(t * 18f)
            Gfx.nine("ui/panel-peach", Layout.RAIL_X + 40f, Layout.RAIL_Y + 28f, Layout.RAIL_W - 80f, Layout.RAIL_H - 50f, 90, 0.3f, a * 0.5f, RAGE_RED)
            Gfx.text("긴급 보급!", 600f, Layout.RAIL_CY, 50f, RAGE_RED, outline = true, alpha = 0.6f + 0.4f * sin(t * 18f))
            Gfx.rect(Layout.RAIL_X0, Layout.RAIL_Y + 106f, (Layout.RAIL_X1 - Layout.RAIL_X0) * (em.t / em.max), 8f, RAGE_RED)
        }
        Gfx.panel(28f, 712f, 227f, 89f)
        Gfx.text("보급 레일", 141f, 756f, 34f)
        // 배달 대상 초상화
        var tgt = b.lastTarget
        var special = false
        val d = b.drag
        if (d != null && d.moved && !d.item.chest) {
            if (d.item.line == Line.special) special = true
            else tgt = (if (d.y < Layout.RAIL_Y) b.catAt(d.x, d.y) else null) ?: b.autoTarget(d.item.line, d.item.tier)
        }
        val pulse = if (d != null && d.moved) 1f + sin(t * 10f) * 0.04f else 1f
        val pw = 126f * pulse
        val ph = 119f * pulse
        Gfx.panel(886f - pw / 2, 763f - ph / 2, pw, ph, if (special) "lavender" else "mint")
        when {
            special -> Gfx.fit("icons/yarn", 886f, 762f, 80f, 80f)
            tgt != null -> Gfx.fit("portraits/cat-${tgt.id}", 886f, 762f, 100f, 96f)
            else -> Gfx.fit("icons/cat", 886f, 762f, 70f, 70f, 0.5f)
        }
        for (r in b.rail) {
            val s = if (!r.flying) 1f else 1f - min(1f, r.t / r.flyDur) * 0.4f
            drawItem(r.item, r.x, r.y, 0.85f * s)
        }
    }

    private fun drawItem(item: BoardItem, cx: Float, cy: Float, scale: Float, alpha: Float = 1f, rotation: Float = 0f) {
        if (item.chest) Gfx.chest(cx, cy, scale, alpha, rotation) else Gfx.item(item.line, item.tier, cx, cy, scale, alpha)
    }

    fun drawBoard(t: Float) {
        val shake = if (b.boardShake > 0f) sin(b.boardShake * 80f) * 10f else 0f
        Gfx.panel(51f + shake, 846f, 978f, 790f)
        val d = b.drag
        val hover = if (d != null && d.moved) Layout.cellAt(d.x, d.y) else -1
        for (i in 0 until b.board.size) {
            val cell = b.board[i]
            val x = Layout.cellX(i) + shake
            val y = Layout.cellY(i)
            val cx = x + Layout.CELL / 2
            val cy = y + Layout.CELL / 2
            Gfx.fit("ui/board-cell", cx, cy, Layout.CELL, Layout.CELL)
            if (d != null && i == hover && hover != d.from) {
                val other = cell.item
                val good = other != null && other.sameAs(d.item) && other.tier < b.mergeCap && cell.frozen <= 0f
                if (good) Gfx.img("ui/merge-glow", x - 30f, y - 30f, Layout.CELL + 60f, Layout.CELL + 60f, 0.6f + 0.3f * sin(t * 12f))
                else Gfx.fit("ui/board-cell", cx, cy, Layout.CELL, Layout.CELL, 0.5f, HOVER)
            }
            val it = cell.item
            if (it != null && d?.item !== it) {
                if (it.flyT > 0f) {
                    val k = 1f - it.flyT / it.flyMax
                    val fxX = Layout.SMITH_X + (cx - Layout.SMITH_X) * k
                    val fxY = Layout.SMITH_Y + (cy - Layout.SMITH_Y) * k - sin(k * PI.toFloat()) * 260f
                    drawItem(it, fxX, fxY, 0.6f + k * 0.4f)
                } else {
                    val pop = if (it.pop > 0f) 1f + sin((1f - it.pop / 0.4f) * PI.toFloat()) * 0.35f else 1f
                    if (d != null && d.moved && it.sameAs(d.item) && it.tier < b.mergeCap) {
                        Gfx.additive { Gfx.fit("ui/board-cell", cx, cy, Layout.CELL - 8f, Layout.CELL - 8f, 0.25f + 0.2f * sin(t * 8f), Gfx.lineColor(it.line)) }
                    }
                    if (!it.chest && it.tier >= 6) Gfx.additive { Gfx.glow(cx, cy, 70f, LEGEND_GLOW, 0.25f + 0.15f * sin(t * 4f + i)) }
                    val wob = if (it.chest) sin(t * 6f + i) * 3.4f else 0f
                    drawItem(it, cx, cy - 6f, 0.95f * pop, rotation = wob)
                    if (!it.chest) Gfx.text("Lv.${it.tier}", x + Layout.CELL - 30f, y + Layout.CELL - 18f, 22f, LV_TEXT)
                }
            }
            if (cell.frozen > 0f) {
                Gfx.fit("ui/board-cell", cx, cy, Layout.CELL, Layout.CELL, 0.75f, ICE_TINT)
                Gfx.text("빙결 ${kotlin.math.ceil(cell.frozen).toInt()}", cx, cy, 28f, ICE_TEXT)
            }
        }
        if (b.comboT > 0f && b.combo >= 2) {
            val a = min(1f, b.comboT)
            val s = 1f + max(0f, b.comboT - 2.2f) * 1.5f
            Gfx.text("${b.combo} COMBO!", 900f, 846f, 50f, COMBO, outline = true, alpha = a, scale = s)
        }
    }

    fun drawBottom(t: Float) {
        Chars.shadow(160f, 1895f, 233f)
        // 모루를 먼저 깔고 그 위로 망치질하는 대장장이를 그린다
        Gfx.fit("icons/anvil", 220f, 1876f, 168f, 124f)
        if (b.smithT > 0f) Chars.catAttack("smith", if (b.smithT > 0.18f) 0 else 1, 160f, 1905f, 0.58f)
        else Chars.idle("smith", 160f, 1905f, 0.58f, t)
        Gfx.panel(744f, 1686f, 307f, 94f, "dark")
        Gfx.fit("icons/energy", 790f, 1733f, 60f, 60f)
        Gfx.text("${b.energy} / ${b.energyMax}", 915f, 1733f, 44f, Color.WHITE)
        if (b.energy < b.energyMax) Gfx.rect(830f, 1765f, 190f * (b.regenT / b.regenEvery), 5f, ENERGY_TICK)
        val fr = if (b.feverT > 0f) b.feverT / b.feverDur else b.feverGauge / b.feverMax
        Gfx.bar(754f, 1796f, 287f, 43f, fr, if (b.feverT > 0f) "ui/progress-red" else "ui/progress-gold")
        Gfx.text(if (b.feverT > 0f) "FEVER ${kotlin.math.ceil(b.feverT).toInt()}" else "피버", 897f, 1818f, 28f, Color.WHITE, outline = true)
        if (b.feverGauge / b.feverMax > 0.75f && b.feverT <= 0f) {
            Gfx.additive { Gfx.nine("ui/progress-gold", 754f, 1796f, 287f, 43f, 45, 0.5f, 0.3f + 0.3f * sin(t * 12f)) }
        }
        if (b.autoEvery > 0f) Gfx.text("자동 생산 ${kotlin.math.ceil(b.autoEvery - b.autoT).toInt()}초", 897f, 1872f, 26f, Color.WHITE, outline = true)
    }

    /** 상단 HUD는 긴 화면에서 화면 맨 위에 붙는다 */
    fun drawHud() = Gfx.shifted(Gfx.safeTop - Gfx.ext) { drawHudBody() }

    private fun drawHudBody() {
        Gfx.nine("ui/title-banner", 22f, 18f, 316f, 104f, 100, 0.45f)
        Gfx.text(b.title(), 180f, 68f, 32f, maxW = 260f)
        Gfx.panel(358f, 25f, 266f, 83f, "dark")
        val waveLabel = if (b.mode == Mode.WORLD_BOSS) "WORLD BOSS" else "WAVE ${max(1, b.waveIdx + 1)} / ${b.waves.size}"
        Gfx.text(waveLabel, 491f, 67f, 38f, Color.WHITE)
        Gfx.fit("icons/clock", 690f, 63f, 73f, 73f)
        Gfx.panel(734f, 25f, 217f, 83f, "dark")
        val tm = if (b.mode == Mode.WORLD_BOSS) max(0f, b.timeLimit - b.time) else b.time
        Gfx.text("%02d:%02d".format((tm / 60).toInt(), (tm % 60).toInt()), 842f, 67f, 46f, if (b.mode == Mode.WORLD_BOSS && tm < 15f) HURT else Color.WHITE)
        Gfx.panel(620f, 120f, 200f, 60f, "dark")
        Gfx.fit("icons/gold", 650f, 150f, 44f, 44f)
        Gfx.text(shortNum(b.killGold.toDouble()), 740f, 150f, 32f, Gfx.GOLD)
        val (hp, mx) = b.teamHp()
        Gfx.fit("icons/paw", 50f, 160f, 56f, 56f)
        Gfx.text("아군 HP", 90f, 160f, 34f, Color.WHITE, Align.left, outline = true)
        Gfx.bar(35f, 183f, 435f, 45f, hp / mx, "ui/progress-mint")
        Gfx.text("%,d / %,d".format(hp.toInt(), mx.toInt()), 252f, 205f, 28f, Color.WHITE, outline = true)
        val f = b.hpBarFoe
        if (f != null && !f.dead) {
            Gfx.text(f.name, 1030f, 160f, 34f, Color.WHITE, Align.right, outline = true)
            if (f.world) {
                Gfx.bar(560f, 183f, 491f, 45f, 1f - (b.time / b.timeLimit) * 0.15f, "ui/progress-red")
                Gfx.text("누적 피해 ${shortNum(b.totalDamage)}", 805f, 205f, 28f, Color.WHITE, outline = true)
            } else {
                Gfx.bar(560f, 183f, 491f, 45f, (f.hp / f.maxHp).toFloat(), "ui/progress-red")
                if (f.shieldHp > 0) Gfx.bar(560f, 225f, 491f, 26f, (f.shieldHp / f.shieldMax).toFloat(), "ui/progress-mint")
                Gfx.text("${shortNum(max(0.0, f.hp))} / ${shortNum(f.maxHp)}", 805f, 205f, 28f, Color.WHITE, outline = true)
            }
        } else if (b.phase == Phase.WAVE || b.phase == Phase.BREAK) {
            Gfx.text(if (b.phase == Phase.BREAK) "다음 웨이브 준비" else "남은 몬스터 ${b.remainingFoes()}", 1030f, 250f, 32f, Color.WHITE, Align.right, outline = true)
        }
        if (b.phase == Phase.BREAK && b.breakDur > 2f) {
            Gfx.panel(380f, 240f, 320f, 150f, "mint")
            Gfx.text("정비 시간 ${kotlin.math.ceil(b.breakDur - b.phaseT).toInt()}", 540f, 282f, 38f)
        }
    }

    fun drawDrag() {
        val d = b.drag ?: return
        if (!d.moved) return
        drawItem(d.item, d.x, d.y - 40f, 1.25f + sin(System.nanoTime() / 1e8f) * 0.03f, 0.9f)
        if (!d.item.chest && d.y < Layout.RAIL_Y + Layout.RAIL_H + 10f) {
            val cat = if (d.y < Layout.RAIL_Y) b.catAt(d.x, d.y) else null
            val label = when {
                d.item.line == Line.special -> "놓으면 광역 공격!"
                cat != null -> "${cat.def.name}에게 직접 보급"
                else -> "보급!"
            }
            Gfx.text(label, d.x, d.y - 120f, 36f, Color.WHITE, outline = true)
        }
    }

    fun drawFever(t: Float) {
        if (b.feverT <= 0f || b.result?.shown == true) return
        val a = 0.35f + 0.15f * sin(t * 10f)
        Gfx.additive {
            for (i in 0 until 8) {
                val k = i / 8f
                Gfx.rect(0f, Gfx.top + k * 60f, Gfx.W, 8f, FEVER_EDGE, a * (1 - k) * 0.5f)
                Gfx.rect(0f, Gfx.bottom - k * 60f - 8f, Gfx.W, 8f, FEVER_EDGE, a * (1 - k) * 0.5f)
                Gfx.rect(k * 60f, Gfx.top, 8f, Gfx.bottom - Gfx.top, FEVER_EDGE, a * (1 - k) * 0.5f)
                Gfx.rect(Gfx.W - k * 60f - 8f, Gfx.top, 8f, Gfx.bottom - Gfx.top, FEVER_EDGE, a * (1 - k) * 0.5f)
            }
        }
        val s = 1f + sin(t * 8f) * 0.05f
        Gfx.additive { Gfx.glow(170f, 290f, 160f, FEVER_EDGE, 0.5f) }
        Gfx.text("FEVER!", 170f, 290f, 70f, COMBO, outline = true, scale = s)
    }

    fun drawBanners(t: Float) {
        if (b.phase == Phase.INTRO) {
            val k = b.phaseT / 1.4f
            val x = when {
                k < 0.25f -> -500f + (540f + 500f) * easeOutBack(k / 0.25f)
                k > 0.8f -> 540f + 600f * (k - 0.8f) / 0.2f * 2f
                else -> 540f
            }
            Gfx.rect(0f, 380f, Gfx.W, 180f, DARK, 0.5f)
            Gfx.text(b.title(), x, 440f, 64f, Color.WHITE, outline = true)
            val sub = when (b.mode) {
                Mode.STAGE -> b.data.chapters[b.spec.chapter].rule
                Mode.WORLD_BOSS -> "90초 동안 최대한 많은 피해를!"
                Mode.TOWER -> "끝까지 버텨 보세요!"
            }
            Gfx.text(sub, x, 510f, 34f, BANNER_SUB, outline = true)
        }
        b.banner?.let { bn ->
            val k = 1f - bn.t / 1.6f
            val s = if (k < 0.15f) easeOutBack(k / 0.15f) else 1f
            val a = if (k > 0.8f) (1f - k) / 0.2f else 1f
            val h = if (bn.sub.isNotEmpty()) 140f else 100f
            for (i in 0 until 10) {
                val edge = min(i, 9 - i) / 2f
                Gfx.rect(i * 108f, 285f, 108f, h, DARK, a * 0.6f * min(1f, edge))
            }
            Gfx.text(bn.text, 540f, 335f, 64f, bn.color, outline = true, alpha = a, scale = s)
            if (bn.sub.isNotEmpty()) Gfx.text(bn.sub, 540f, 398f, 30f, Color.WHITE, outline = true, alpha = a)
        }
        b.bossCut?.let { cut ->
            val k = cut.t / 2.4f
            val a = when {
                k < 0.1f -> k / 0.1f
                k > 0.85f -> (1f - k) / 0.15f
                else -> 1f
            }
            Gfx.rect(0f, 280f, Gfx.W, 320f, CUT_BG, a * 0.75f)
            Gfx.rect(0f, 272f, Gfx.W, 8f, CUT_LINE, a)
            Gfx.rect(0f, 600f, Gfx.W, 8f, CUT_LINE, a)
            Chars.foe(cut.atkId, 0, -300f + 550f * easeOut(min(1f, k * 4f)), 620f, 0.75f, alpha = a)
            val x = 1080f + 300f + (540f - 1380f) * easeOut(min(1f, k * 5f)) - k * 60f
            Gfx.text("WARNING", x + 120f, 350f, 50f, CUT_LINE, alpha = a * (0.6f + 0.4f * sin(t * 20f)))
            Gfx.text(cut.name, x + 120f, 440f, 76f, Color.WHITE, outline = true, alpha = a, maxW = 640f)
            Gfx.text(cut.tip, x + 120f, 520f, 30f, CUT_TIP, alpha = a, maxW = 620f)
        }
    }

    fun drawTutorial(t: Float) {
        if (b.tutorial < 0 || b.phase == Phase.INTRO) return
        val msgs = listOf("같은 아이템을 겹치면 합성돼요!", "합성한 무기를 보급 레일로 끌어 보급!", "생산 버튼으로 새 아이템을 만들어요 (3번)")
        Gfx.panel(40f, 1606f, 700f, 104f, "mint")
        Gfx.text(msgs[b.tutorial], 390f, 1658f, 32f, maxW = 640f)
        val (fx0, fy0, tx, ty) = when (b.tutorial) {
            0 -> listOf(Layout.cellCx(16), Layout.cellCy(16), Layout.cellCx(18), Layout.cellCy(18))
            1 -> {
                val i = b.board.cells.indexOfFirst { it.item?.chest == false }.let { if (it < 0) 18 else it }
                listOf(Layout.cellCx(i), Layout.cellCy(i), 600f, Layout.RAIL_CY)
            }
            else -> listOf(522f, 1807f, 522f, 1807f)
        }
        val k = (t % 1.6f) / 1.6f
        val m = when {
            k < 0.2f -> 0f
            k > 0.8f -> 1f
            else -> (k - 0.2f) / 0.6f
        }
        val x = fx0 + (tx - fx0) * easeOut(m)
        val y = fy0 + (ty - fy0) * easeOut(m)
        val press = if (b.tutorial == 2) sin(t * 8f) * 10f else 0f
        Gfx.img("ui/tutorial-hand", x - 40f, y - 10f + press, 150f, 160f)
    }

    fun drawLegend() {
        val l = b.legend ?: return
        val k = min(1f, l.t / 0.4f)
        Gfx.fullRect(LEGEND_BG, 0.75f * k)
        Gfx.additive {
            for (i in 0 until 16) {
                val ang = i * 22.5f + l.t * 10f
                val rad = Math.toRadians(ang.toDouble())
                Gfx.line(540f, 800f, 540f + kotlin.math.cos(rad).toFloat() * 900f, 800f + kotlin.math.sin(rad).toFloat() * 900f, 120f, LEGEND_RAY, 0.12f * k)
            }
        }
        Gfx.item(l.line, 8, 540f, 800f, easeOutBack(k) * 3.2f)
        Gfx.text("전설 등급 제작!", 540f, 1120f, 80f, COMBO, outline = true, alpha = k)
        Gfx.text("${b.data.itemName(l.line, 8)} · 도감 등록", 540f, 1210f, 42f, Color.WHITE, outline = true, alpha = k)
        if (Math.random() < 0.5) fx.p { x = com.mergenyang.game.rnd(200f, 880f); y = com.mergenyang.game.rnd(500f, 1100f); img = "icons/star"; size = com.mergenyang.game.rnd(20f, 50f); life = 0.8f; vy = -80f; additive = false; ui = true }
    }

    companion object {
        val BOSS_TINT: Color = Color.valueOf("280a28ff")
        val ARROW_TRAIL: Color = Color.valueOf("fff0b4ff")
        val ARROW_SHAFT: Color = Color.valueOf("6a4020ff")
        val ARROW_HEAD: Color = Color.valueOf("e8e8f0ff")
        val FEVER_GLOW: Color = Color.valueOf("ffaa28ff")
        val RAGE_GLOW: Color = Color.valueOf("78ffbeff")
        val POISON_TINT: Color = Color.valueOf("9b4dffff")
        val RAGE_RED: Color = Color.valueOf("ff3a2aff")
        val SHIELD: Color = Color.valueOf("8fe3ffff")
        val EM_RED: Color = Color.valueOf("ff3c28ff")
        val RAIL_GREEN: Color = Color.valueOf("8cffbeff")
        val HOVER = Color(1f, 1f, 1f, 1f)
        val LEGEND_GLOW: Color = Color.valueOf("fff3a0ff")
        val LV_TEXT: Color = Color.valueOf("6a4a2aff")
        val ICE_TINT: Color = Color.valueOf("bfefffff")
        val ICE_TEXT: Color = Color.valueOf("3a7aa0ff")
        val COMBO: Color = Color.valueOf("ffe14aff")
        val ENERGY_TICK: Color = Color.valueOf("ffe678ff")
        val HURT: Color = Color.valueOf("ff7a6aff")
        val FEVER_EDGE: Color = Color.valueOf("ff6e14ff")
        val DARK: Color = Color.valueOf("2a120aff")
        val BANNER_SUB: Color = Color.valueOf("ffe8b0ff")
        val CUT_BG: Color = Color.valueOf("14000aff")
        val CUT_LINE: Color = Color.valueOf("ff3a4aff")
        val CUT_TIP: Color = Color.valueOf("ffd0c0ff")
        val LEGEND_BG: Color = Color.valueOf("140a1eff")
        val LEGEND_RAY: Color = Color.valueOf("ffdc78ff")
    }
}

/** 보급 레일: 양 끝은 원본, 가운데 칸(원본 x 270~420)만 비율을 유지하며 반복 */
fun Gfx.fitRail() {
    val r = assets.region("ui/supply-rail") ?: return
    val tex = r.texture
    val iw = r.regionWidth
    val ih = r.regionHeight
    val s = Layout.RAIL_H / ih
    val l = 270
    val rr = 420
    val lw = l * s
    val rw = (iw - rr) * s
    val n = max(1, kotlin.math.round((Layout.RAIL_W - lw - rw) / ((rr - l) * s)).toInt())
    val uw = (Layout.RAIL_W - lw - rw) / n
    val y = H - Layout.RAIL_Y - Layout.RAIL_H
    val tr = com.badlogic.gdx.graphics.g2d.TextureRegion(tex)
    fun part(srcX: Int, srcW: Int, dx: Float, dw: Float) {
        tr.setRegion(r.regionX + srcX, r.regionY, srcW, ih)
        batch.draw(tr, dx, y, dw + 0.5f, Layout.RAIL_H)
    }
    part(0, l, Layout.RAIL_X, lw)
    for (i in 0 until n) part(l, rr - l, Layout.RAIL_X + lw + i * uw, uw)
    part(rr, iw - rr, Layout.RAIL_X + Layout.RAIL_W - rw, rw)
}
