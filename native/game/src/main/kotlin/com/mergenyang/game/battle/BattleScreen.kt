package com.mergenyang.game.battle

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Input
import com.badlogic.gdx.InputAdapter
import com.badlogic.gdx.InputMultiplexer
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.scenes.scene2d.Group
import com.badlogic.gdx.scenes.scene2d.Stage
import com.mergenyang.core.BattleSpec
import com.mergenyang.core.Mode
import com.mergenyang.game.Gfx
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.Screens
import com.mergenyang.game.easeOutBack
import com.mergenyang.game.screens.CatsScreen
import com.mergenyang.game.screens.LobbyScreen
import com.mergenyang.game.screens.ModesScreen
import com.mergenyang.game.screens.StagesScreen
import com.mergenyang.game.screens.fmt
import com.mergenyang.game.ui.DimActor
import com.mergenyang.game.ui.DrawActor
import com.mergenyang.game.ui.ImgActor
import com.mergenyang.game.ui.NyButton
import com.mergenyang.game.ui.PanelActor
import com.mergenyang.game.ui.TextActor
import com.mergenyang.game.ui.at
import ktx.app.KtxScreen
import kotlin.math.min

class BattleScreen(private val game: MergeNyangGame) : KtxScreen {
    var battle: Battle? = null
        private set
    private var renderer: BattleRenderer? = null
    private val hud = Stage(Screens.viewport, game.batch)
    private val top = Stage(Screens.viewport, game.batch)
    private val controls = Group()
    private val overlay = Group()
    private var time = 0f
    private val cam = FloatArray(3)
    private val tmp = Vector2()
    private var overlayKind = ""

    private lateinit var produceBtn: NyButton
    private lateinit var skipBtn: NyButton

    init {
        hud.addActor(controls)
        top.addActor(overlay)
    }

    private var pendingSpec: BattleSpec? = null

    /** 다음 show()에서 새 전투를 만든다 (페이드 전환 중에는 기존 전투 유지) */
    fun prepare(spec: BattleSpec) {
        pendingSpec = spec
    }

    private val input = object : InputAdapter() {
        private fun toWorld(sx: Int, sy: Int): Vector2 {
            tmp.set(sx.toFloat(), sy.toFloat())
            Screens.viewport.unproject(tmp)
            tmp.y = Gfx.H - tmp.y
            return tmp
        }

        override fun touchDown(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
            if (pointer > 0) return false
            val p = toWorld(screenX, screenY)
            battle?.onDown(p.x, p.y)
            return true
        }

        override fun touchDragged(screenX: Int, screenY: Int, pointer: Int): Boolean {
            if (pointer > 0) return false
            val p = toWorld(screenX, screenY)
            battle?.onMove(p.x, p.y)
            return true
        }

        override fun touchUp(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
            if (pointer > 0) return false
            val p = toWorld(screenX, screenY)
            battle?.onUp(p.x, p.y)
            return true
        }

        override fun keyDown(keycode: Int): Boolean {
            if (keycode != Input.Keys.BACK && keycode != Input.Keys.ESCAPE) return false
            val b = battle ?: return true
            if (b.result?.shown == true) game.go<LobbyScreen>()
            else b.paused = !b.paused
            return true
        }
    }

    override fun show() {
        pendingSpec?.let { spec ->
            battle?.dispose()
            battle = Battle(game, spec).also { renderer = BattleRenderer(it) }
            pendingSpec = null
        }
        time = 0f
        overlayKind = ""
        overlay.clearChildren()
        buildControls()
        Gdx.input.inputProcessor = InputMultiplexer(top, hud, input)
        game.audio.music("battle")
    }

    override fun hide() {
        battle?.drag = null
    }

    override fun pause() {
        battle?.let { if (it.result == null) it.paused = true }
    }

    private fun buildControls() {
        controls.clearChildren()
        val b = battle ?: return
        controls.at(NyButton("", "cream", icon = "icons/pause", iconSize = 54f) { b.paused = true }, 970f, 23f, 89f, 89f)
        produceBtn = controls.at(NyButton("생산", "yellow", sub = "에너지 1", icon = "icons/paw", textSize = 50f) { b.produce() }, 329f, 1726f, 386f, 162f)
        skipBtn = controls.at(NyButton("바로 시작", "yellow", textSize = 28f) { b.skipBreak() }, 430f, 308f, 220f, 66f)
    }

    private fun syncControls(b: Battle) {
        produceBtn.disabled = b.tutorial == 0 || b.tutorial == 1
        produceBtn.pulse = b.tutorial == 2 || (b.energy >= 1 && b.board.emptyCells().size > 20)
        skipBtn.isVisible = b.phase == Phase.BREAK && b.breakDur > 2f && b.result == null
        val modal = b.paused || b.result?.shown == true
        controls.touchable = if (modal) com.badlogic.gdx.scenes.scene2d.Touchable.disabled else com.badlogic.gdx.scenes.scene2d.Touchable.childrenOnly
        val want = when {
            b.result?.shown == true -> "result"
            b.paused -> "pause"
            else -> ""
        }
        if (want != overlayKind) {
            overlayKind = want
            overlay.clearChildren()
            when (want) {
                "pause" -> buildPause(b)
                "result" -> buildResult(b)
            }
        }
    }

    override fun render(delta: Float) {
        val b = battle ?: return
        val r = renderer ?: return
        time += delta
        b.update(delta)
        syncControls(b)
        hud.act(delta)
        top.act(delta)

        val vp = Screens.viewport
        val camera = vp.camera as com.badlogic.gdx.graphics.OrthographicCamera
        val fx = game.fx
        fx.cameraOffset(cam)
        vp.apply()
        // 흔들림·줌이 적용된 전장 레이어
        camera.position.set(Gfx.W / 2 + cam[0], Gfx.H / 2 - cam[1], 0f)
        camera.zoom = 1f / cam[2]
        camera.update()
        game.batch.projectionMatrix = camera.combined
        game.batch.begin()
        r.drawWorld(time)
        game.batch.end()
        camera.zoom = 1f
        game.beginHud()
        r.drawRail(time)
        r.drawBoard(time)
        r.drawBottom(time)
        r.drawHud()
        game.batch.end()

        hud.draw()

        camera.position.set(Gfx.W / 2 + cam[0], Gfx.H / 2 - cam[1], 0f)
        camera.update()
        game.batch.projectionMatrix = camera.combined
        game.batch.begin()
        fx.drawWorld()
        fx.drawTexts()
        game.batch.end()

        game.beginHud()
        r.drawDrag()
        fx.drawParts(true)
        r.drawFever(time)
        r.drawBanners(time)
        r.drawTutorial(time)
        r.drawLegend()
        fx.drawOverlay()
        game.batch.end()
        top.draw()
    }

    // ---------- 오버레이 (Scene2D) ----------
    private fun buildPause(b: Battle) {
        overlay.at(DimActor(0.6f), 0f, 0f, Gfx.W, Gfx.H)
        overlay.at(PanelActor("ui/panel-cream"), 170f, 560f, 740f, 760f)
        overlay.at(ImgActor("icons/pause"), 480f, 640f, 120f, 120f)
        overlay.at(TextActor("잠시 쉬어갈까요?", 56f), 170f, 780f, 740f, 80f)
        overlay.at(TextActor(b.title(), 32f, Gfx.MUTED), 170f, 865f, 740f, 50f)
        overlay.at(NyButton("계속하기", "yellow") { b.paused = false }, 290f, 950f, 500f, 120f)
        overlay.at(NyButton("다시 시작", "mint") { restart(b) }, 290f, 1080f, 500f, 110f)
        overlay.at(NyButton("전투 나가기", "peach") { game.go<LobbyScreen>() }, 290f, 1200f, 500f, 100f)
    }

    private fun restart(b: Battle) {
        val spec = if (b.mode == Mode.TOWER) b.spec.copy(floor = 1) else b.spec
        game.startBattle(spec, free = b.mode == Mode.TOWER)
    }

    private fun buildResult(b: Battle) {
        val r = b.result ?: return
        val win = r.win
        val start = time
        val t = { time - start }
        overlay.at(DimActor(0.65f), 0f, 0f, Gfx.W, Gfx.H)
        val panel = Group()
        overlay.addActor(panel)
        panel.at(PanelActor(if (win) "ui/panel-cream" else "ui/panel-lavender"), 110f, 380f, 860f, 1180f)
        if (win) {
            panel.at(ImgActor("ui/victory-laurel"), 260f, 335f, 560f, 350f)
            val title = when (b.mode) {
                Mode.WORLD_BOSS -> "도전 완료!"
                Mode.TOWER -> "${r.floor}층 돌파!"
                Mode.STAGE -> "승리했어요!"
            }
            panel.at(TextActor(title, 76f, Color.WHITE, outline = true), 110f, 470f, 860f, 100f)
        } else {
            panel.at(ImgActor("portraits/cat-healer"), 390f, 400f, 300f, 260f)
            panel.at(TextActor("다시 도전해 볼까요?", 60f, Color.WHITE, outline = true), 110f, 640f, 860f, 80f)
        }
        var y = 740f
        when {
            b.mode == Mode.STAGE && win -> {
                panel.at(DrawActor {
                    for (i in 0 until 3) {
                        val st = t() - 0.5f - i * 0.35f
                        val on = i < r.stars
                        if (st > 0 && !r.starShown[i]) {
                            r.starShown[i] = true
                            if (on) {
                                game.audio.play("star", 1f + i * 0.25f)
                                game.fx.stars(540f + (i - 1) * 190f, 760f, 10, 500f, 50f, true)
                            }
                        }
                        val s = if (st > 0) easeOutBack(min(1f, st / 0.3f)) else 0f
                        if (s > 0f) Gfx.fit("icons/star", 540f + (i - 1) * 190f, 760f - if (i == 1) 30f else 0f, 160f * s, 160f * s, if (on) 1f else 0.3f, if (on) Color.WHITE else DIM_STAR)
                    }
                }, 110f, 660f, 860f, 200f)
                y += 140f
                val labels = listOf("스테이지 클리어", "아군 체력 50% 이상", "150초 내 클리어 또는 피버 2회")
                labels.forEachIndexed { i, l ->
                    val ok = r.checks.getOrElse(i) { false }
                    panel.at(ImgActor(if (ok) "icons/check" else "icons/close"), 240f, y + i * 56f - 20f, 40f, 40f)
                    panel.at(TextActor(l, 32f, if (ok) Gfx.BROWN else MISS, com.badlogic.gdx.utils.Align.left), 300f, y + i * 56f - 25f, 600f, 50f)
                }
                y += 190f
            }
            b.mode == Mode.WORLD_BOSS -> {
                panel.at(TextActor("누적 피해량", 36f, Gfx.MUTED), 110f, y, 860f, 50f)
                panel.at(TextActor({ fmt((min(1f, t() / 1.5f) * r.damage).toLong()) }, 96f, DAMAGE, outline = true), 110f, y + 50f, 860f, 110f)
                panel.at(TextActor("최고 기록 ${fmt(game.save.bossBest)}", 32f, Gfx.MUTED), 110f, y + 170f, 860f, 50f)
                y += 290f
            }
            b.mode == Mode.TOWER -> {
                panel.at(TextActor("최고 기록 ${game.save.towerBest}층", 48f), 110f, y + 30f, 860f, 70f)
                y += 170f
            }
            else -> {
                panel.at(TextActor("고양이를 성장시키거나 합성을 더 빠르게!", 34f, TIP), 110f, y + 5f, 860f, 50f)
                val tip = b.boss?.bossDef?.tip ?: "방어구는 뚱냥이에게 1.5배 효과"
                panel.at(TextActor("팁: $tip", 30f, TIP_SUB), 150f, y + 65f, 780f, 50f)
                y += 190f
            }
        }
        panel.at(PanelActor("ui/panel-mint"), 200f, y, 680f, 130f)
        panel.at(ImgActor("icons/gold"), 255f, y + 30f, 70f, 70f)
        panel.at(TextActor({ fmt((min(1f, t() / 1.2f) * r.gold).toLong()) }, 48f), 340f, y + 30f, 220f, 70f)
        panel.at(ImgActor("icons/gem"), 575f, y + 30f, 70f, 70f)
        panel.at(TextActor({ fmt((min(1f, t() / 1.2f) * r.gems).toInt()) }, 48f), 650f, y + 30f, 180f, 70f)
        y += 170f
        val bx = 200f
        val bw = 680f
        val d = game.data
        when (b.mode) {
            Mode.STAGE -> if (win) {
                val s = b.spec
                val hasNext = s.stage < d.stagesPerChapter - 1 || s.chapter < d.chapters.size - 1
                if (hasNext) panel.at(NyButton("다음 스테이지", "yellow", sub = "에너지 ${d.balance.stageEnergyCost}", pulse = true) {
                    val next = if (s.stage < d.stagesPerChapter - 1) s.copy(stage = s.stage + 1) else s.copy(chapter = s.chapter + 1, stage = 0)
                    game.startBattle(next)
                }, bx, y, bw, 130f)
            } else {
                panel.at(NyButton("다시 도전", "yellow", sub = "에너지 ${d.balance.stageEnergyCost}", pulse = true) { game.startBattle(b.spec) }, bx, y, bw, 130f)
            }
            Mode.TOWER -> if (win) {
                panel.at(NyButton("${b.spec.floor + 1}층 도전", "yellow", pulse = true) { game.startBattle(b.spec.copy(floor = b.spec.floor + 1), free = true) }, bx, y, bw, 130f)
            } else {
                panel.at(NyButton("1층부터 다시", "yellow", sub = "에너지 ${d.balance.stageEnergyCost}") { game.startBattle(b.spec.copy(floor = 1)) }, bx, y, bw, 130f)
            }
            Mode.WORLD_BOSS -> panel.at(NyButton("고양이 성장하기", "yellow") { game.go<CatsScreen>() }, bx, y, bw, 130f)
        }
        panel.at(NyButton(if (b.mode == Mode.STAGE) "스테이지 선택" else "모드 선택", "mint") {
            if (b.mode == Mode.STAGE) game.go<StagesScreen>() else game.go<ModesScreen>()
        }, bx, y + 150f, bw, 110f)
        panel.at(NyButton("로비로", "cream") { game.go<LobbyScreen>() }, bx, y + 270f, bw, 100f)
        // 아래에서 튀어 오르는 등장
        panel.y = -Gfx.H
        panel.addAction(com.badlogic.gdx.scenes.scene2d.actions.Actions.moveTo(0f, 0f, 0.45f, com.badlogic.gdx.math.Interpolation.swingOut))
    }

    override fun dispose() {
        battle?.dispose()
        hud.dispose()
        top.dispose()
    }

    companion object {
        val DIM_STAR = Color(0.6f, 0.6f, 0.6f, 1f)
        val MISS: Color = Color.valueOf("aa9a8aff")
        val DAMAGE: Color = Color.valueOf("e0503aff")
        val TIP: Color = Color.valueOf("4a2a5aff")
        val TIP_SUB: Color = Color.valueOf("7a4a8aff")
    }
}

