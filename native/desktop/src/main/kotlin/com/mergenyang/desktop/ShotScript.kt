package com.mergenyang.desktop

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.PixmapIO
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.utils.BufferUtils
import com.badlogic.gdx.utils.ScreenUtils
import com.mergenyang.core.BattleSpec
import com.mergenyang.core.Line
import com.mergenyang.core.Mode
import com.mergenyang.game.DebugHook
import com.mergenyang.game.Gfx
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.Screens
import com.mergenyang.game.battle.AutoPlayer
import com.mergenyang.game.battle.BattleScreen
import com.mergenyang.game.battle.Layout
import com.mergenyang.game.screens.CatsScreen
import com.mergenyang.game.screens.GrowthScreen
import com.mergenyang.game.screens.ModesScreen
import com.mergenyang.game.screens.RankingScreen
import com.mergenyang.game.screens.ShopScreen
import com.mergenyang.game.screens.StagesScreen
import java.io.File

/** 자동 시나리오: 메뉴를 돌고 전투를 자동 진행하며 장면마다 PNG를 저장한다 */
class ShotScript(private val dir: File, private val smithOnly: Boolean = false) : DebugHook {
    private lateinit var game: MergeNyangGame
    private val steps = ArrayList<Pair<Int, () -> Unit>>()
    private var index = 0
    private var wait = 0
    private var bot: AutoPlayer? = null
    private val log = StringBuilder()

    override fun onCreate(game: MergeNyangGame) {
        this.game = game
        dir.mkdirs()
        dir.listFiles { f -> f.extension == "png" }?.forEach { it.delete() }
        script()
    }

    private fun at(frames: Int, action: () -> Unit) { steps += frames to action }
    private fun shot(name: String) = at(1) { capture(name) }
    private fun battle() = game.getScreen<BattleScreen>().battle!!

    /** 좌상단 기준 논리 좌표를 탭 */
    private fun tap(x: Float, yTop: Float) {
        val vp = Screens.viewport
        val screen = vp.project(Vector2(x, Gfx.H - yTop))
        val sx = screen.x.toInt()
        val sy = (Gdx.graphics.height - screen.y).toInt()
        val ip = Gdx.input.inputProcessor
        ip.touchDown(sx, sy, 0, 0)
        ip.touchUp(sx, sy, 0, 0)
    }

    private fun startBattle(spec: BattleSpec, setup: () -> Unit = {}) {
        setup()
        game.save.energy = 99
        game.startBattle(spec, free = true)
    }

    private fun script() {
        if (smithOnly) {
            at(30) { startBattle(BattleSpec(Mode.STAGE, 0, 0)) { game.save.tutorialDone = true } }
            at(120) { }
            shot("smith_00_ready")
            at(1) { battle().produce() }
            shot("smith_01_contact")
            repeat(24) { i ->
                at(2) {
                    capture("smith_%02d".format(i + 2))
                    if (i % 4 == 0) battle().produce()
                }
            }
            at(60) { capture("smith_26_ready"); File(dir, "log.txt").writeText(log.toString()); Gdx.app.exit() }
            return
        }
        at(60) { }
        shot("01_title")
        at(5) { tap(540f, 1680f) }
        at(80) { }
        shot("02_lobby")
        at(5) { (game.currentScreenOrNull() as? com.mergenyang.game.screens.MenuScreen)?.showPopup("codex") }
        at(20) { }
        shot("02b_codex")
        at(5) { (game.currentScreenOrNull() as? com.mergenyang.game.screens.MenuScreen)?.closePopup() }
        at(10) { }
        at(5) { game.go<ModesScreen>() }
        at(60) { }
        shot("03_modes")
        at(5) { game.go<StagesScreen>() }
        at(60) { }
        shot("04_stages")
        at(5) { tap(160f, 815f) }
        at(20) { }
        shot("05_prepare")
        at(5) { tap(760f, 1390f) }
        at(100) { }
        shot("06_tutorial")
        at(5) {
            val b = battle()
            b.onDown(Layout.cellCx(16), Layout.cellCy(16)); b.onMove(Layout.cellCx(17), Layout.cellCy(17)); b.onMove(Layout.cellCx(18), Layout.cellCy(18)); b.onUp(Layout.cellCx(18), Layout.cellCy(18))
            log.appendLine("tutorial after merge=${b.tutorial}")
        }
        at(40) {
            val b = battle()
            b.onDown(Layout.cellCx(18), Layout.cellCy(18)); b.onMove(400f, 900f); b.onMove(600f, Layout.RAIL_CY); b.onUp(600f, Layout.RAIL_CY)
            log.appendLine("tutorial after supply=${b.tutorial}")
        }
        repeat(3) { at(15) { battle().produce() } }
        at(10) { log.appendLine("tutorial after produce=${battle().tutorial}"); bot = AutoPlayer(battle()) }
        at(600) { }
        shot("07_battle")
        at(1) { waitForCatAttack() }
        shot("08_attack")

        // 챕터 보스
        at(5) {
            bot = null
            startBattle(BattleSpec(Mode.STAGE, 0, 19)) {
                game.save.tutorialDone = true
                (0 until 19).forEach { game.save.stars["0-$it"] = 3 }
                game.save.cats.keys.forEach { game.save.cats[it] = 12 }
                game.save.squad = mutableListOf("warrior", "wizard")
            }
        }
        at(60) { skipToBoss() }
        at(55) { }
        shot("09_boss_cutin")
        at(5) { bot = AutoPlayer(battle()) }
        at(400) { }
        shot("10_boss_fight")
        at(1) { forceEmergency("freeze") }
        at(20) { }
        shot("11_emergency")
        at(80) {
            val b = battle()
            b.feverT = 6f
            val item = b.board.newItem(Line.special, 5)
            val cell = b.board.emptyCells().first()
            b.board[cell].item = item
            b.onDown(Layout.cellCx(cell), Layout.cellCy(cell)); b.onMove(700f, 800f); b.onMove(900f, Layout.RAIL_CY); b.onUp(900f, Layout.RAIL_CY)
        }
        at(30) { }
        shot("12_special_fever")
        at(5) { battle().boss?.let { battle().killFoe(it) } }
        at(45) { }
        shot("13_boss_kill")
        at(240) { }
        shot("14_result")

        // 메뉴
        at(5) { bot = null; game.go<CatsScreen>() }
        at(60) { }
        shot("15_cats")
        at(5) { GrowthScreen.tab = "forge"; game.go<GrowthScreen>() }
        at(60) { }
        shot("16_growth")
        at(5) { game.go<ShopScreen>() }
        at(60) { }
        shot("17_shop")
        at(5) { game.go<RankingScreen>() }
        at(60) { }
        shot("18_ranking")

        // 월드보스
        at(5) { startBattle(BattleSpec(Mode.WORLD_BOSS)) { game.save.squad = mutableListOf("tank", "wizard") } }
        at(90) { bot = AutoPlayer(battle()) }
        at(500) { }
        shot("19_worldboss")

        // 무한의 탑: 한 층을 깨면 결과 화면 없이 다음 층으로 이어진다 (2배속)
        at(5) {
            bot = null
            startBattle(BattleSpec(Mode.TOWER, floor = 1)) {
                game.save.cats.keys.forEach { game.save.cats[it] = 15 }
                game.save.squad = mutableListOf("warrior", "healer")
                game.save.battleSpeed = 2
            }
        }
        at(90) { bot = AutoPlayer(battle()) }
        at(1) { waitForFloor(2) }
        shot("21_tower_next_floor")
        at(240) { }
        shot("22_tower_floor2")
        at(1) { val b = battle(); log.appendLine("tower floor=${b.floor} title=${b.title()} wave=${b.waveIdx} result=${b.result?.win} towerGold=${b.towerGold} best=${game.save.towerBest}") }
        at(5) { frameSheet() }
        at(5) {
            File(dir, "log.txt").writeText(log.toString())
            Gdx.app.exit()
        }
    }

    private fun skipToBoss() {
        val b = battle()
        for (i in 0 until 3) {
            b.startWave(i)
            b.foes.toList().forEach { b.killFoe(it) }
        }
        b.startWave(3)
        log.appendLine("boss=${b.boss?.name} hp=${b.boss?.hp}")
    }

    private fun forceEmergency(pattern: String) {
        val b = battle()
        val boss = b.boss ?: return
        b.emergency = com.mergenyang.game.battle.Emergency(pattern, boss)
        log.appendLine("emergency=$pattern")
    }

    /** 네이티브 렌더러로 대기·공격0·공격1과 겹쳐보기를 그려 캡처 (프레임 크기 검증용) */
    private fun frameSheet() {
        val batch = game.batch
        game.beginHud()
        com.mergenyang.game.Gfx.rect(0f, 0f, Gfx.W, Gfx.H, com.badlogic.gdx.graphics.Color.WHITE)
        val ids = listOf("warrior", "tank", "archer", "healer", "wizard", "smith")
        val c = com.badlogic.gdx.graphics.Color.RED
        ids.forEachIndexed { i, id ->
            val y = 300f + i * 300f
            val s = 0.55f
            com.mergenyang.game.Chars.idle(id, 130f, y, s, 0f)
            com.mergenyang.game.Chars.catAttack(id, 0, 390f, y, s)
            com.mergenyang.game.Chars.catAttack(id, 1, 650f, y, s)
            com.mergenyang.game.Chars.catAttack(id, 0, 920f, y, s, alpha = 0.5f)
            com.mergenyang.game.Chars.catAttack(id, 1, 920f, y, s, alpha = 0.5f)
            com.mergenyang.game.Gfx.rect(0f, y, Gfx.W, 2f, c)
        }
        batch.end()
        capture("20_frame_sheet")
    }

    private var attackWait = 0
    private var floorWait = 0

    private fun waitForFloor(target: Int) {
        val b = battle()
        if (b.floor < target && b.result == null) {
            floorWait++
            if (floorWait < 8000) index-- // 같은 단계를 반복
        }
        if (b.result != null) log.appendLine("tower ended early floor=${b.floor}")
    }

    private fun waitForCatAttack() {
        val b = battle()
        val c = b.cats.first()
        if (c.state != com.mergenyang.game.battle.CatState.ATTACK || !c.struck) {
            attackWait++
            if (attackWait < 600) index-- // 같은 단계를 반복
        }
    }

    private fun capture(name: String) {
        val w = Gdx.graphics.backBufferWidth
        val h = Gdx.graphics.backBufferHeight
        val pixels = ScreenUtils.getFrameBufferPixels(0, 0, w, h, true)
        val pm = Pixmap(w, h, Pixmap.Format.RGBA8888)
        BufferUtils.copy(pixels, 0, pm.pixels, pixels.size)
        PixmapIO.writePNG(Gdx.files.absolute(File(dir, "$name.png").absolutePath), pm)
        pm.dispose()
        val b = runCatching { battle() }.getOrNull()
        log.appendLine("$name: screen=${game.shownScreen()} phase=${b?.phase} wave=${b?.waveIdx} foes=${b?.foes?.size} result=${b?.result?.win}")
    }

    override fun afterRender(game: MergeNyangGame, delta: Float) {
        if (!game.loaded) return
        bot?.let { runCatching { it.tick(delta) } }
        if (index >= steps.size) return
        if (wait < steps[index].first) {
            wait++
            return
        }
        wait = 0
        val action = steps[index].second
        index++
        try {
            action()
        } catch (e: Exception) {
            log.appendLine("step ${index - 1} failed: $e")
            e.printStackTrace()
        }
    }

    private fun MergeNyangGame.shownScreen(): String = currentScreenName()
}
