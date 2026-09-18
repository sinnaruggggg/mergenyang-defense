package com.mergenyang.game.battle

import com.badlogic.gdx.graphics.Color
import com.github.quillraven.fleks.World
import com.github.quillraven.fleks.configureWorld
import com.mergenyang.core.BattleSpec
import com.mergenyang.core.BoardItem
import com.mergenyang.core.DropResult
import com.mergenyang.core.Line
import com.mergenyang.core.MergeBoard
import com.mergenyang.core.Mode
import com.mergenyang.core.Rules
import com.mergenyang.core.Wave
import com.mergenyang.core.Waves
import com.mergenyang.game.Gfx
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.easeOut
import com.mergenyang.game.rnd
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sign
import kotlin.random.Random

/** 전투 화면 배치 (1080x1920, 좌상단 기준) */
object Layout {
    const val GROUND = 640f
    const val COLS = 7
    const val ROWS = 5
    const val BOARD_X = 83f
    const val BOARD_Y = 876f
    const val CELL = 128f
    const val PITCH_X = 131f
    const val PITCH_Y = 150f
    const val RAIL_X = 25f
    const val RAIL_Y = 678f
    const val RAIL_W = 1030f
    const val RAIL_H = 150f
    const val RAIL_CY = 757f
    const val RAIL_X0 = 270f
    const val RAIL_X1 = 880f
    const val SMITH_X = 160f
    const val SMITH_Y = 1760f

    fun cellX(i: Int) = BOARD_X + (i % COLS) * PITCH_X
    fun cellY(i: Int) = BOARD_Y + (i / COLS) * PITCH_Y
    fun cellCx(i: Int) = cellX(i) + CELL / 2
    fun cellCy(i: Int) = cellY(i) + CELL / 2

    fun cellAt(x: Float, y: Float): Int {
        val gx = (PITCH_X - CELL) / 2
        val gy = (PITCH_Y - CELL) / 2
        val c = kotlin.math.floor((x - BOARD_X + gx) / PITCH_X).toInt()
        val r = kotlin.math.floor((y - BOARD_Y + gy) / PITCH_Y).toInt()
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1
        return r * COLS + c
    }
}

enum class Phase { INTRO, TUTORIAL, WAVE, BREAK }

class Banner(val text: String, val color: Color, val sub: String = "") { var t = 1.6f }
class BossCut(val name: String, val tip: String, val atkId: String) { var t = 0f }
class Emergency(val pattern: String, val boss: Foe) { var t = 2.2f; val max = 2.2f; var supplied = false }
class RailItem(val item: BoardItem, var x: Float, var y: Float, val target: CatUnit?, var flying: Boolean) {
    var t = 0f
    var sx = x
    var sy = y
    var flyDur = 0.25f
    var done = false
}
class Drag(val from: Int, val item: BoardItem, var x: Float, var y: Float, val downX: Float, val downY: Float) { var moved = false }
class ChainJob(val cell: Int, var t: Float, val depth: Int, val uid: Int)
class LegendShow(val line: Line) { var t = 0f }

class BattleResult(var win: Boolean, val lost: Boolean) {
    var t = 0f
    var shown = false
    var stars = 0
    var checks = listOf<Boolean>()
    var gold = 0L
    var gems = 0
    var damage = 0L
    var floor = 0
    val starShown = BooleanArray(3)
}

/**
 * 전투 규칙과 흐름. 개체(고양이·몬스터·투사체)는 Fleks 월드의 엔티티로 관리하고,
 * 각 시스템이 매 프레임 이 클래스의 행동 함수를 호출한다.
 */
class Battle(val game: MergeNyangGame, val spec: BattleSpec) {
    val data = game.data
    val rules: Rules = game.rules
    val fx = game.fx
    private val audio = game.audio
    private val save = game.save
    private val progress = game.progress
    private val random = Random.Default

    val mode = spec.mode
    /** 현재 층 (무한의 탑은 한 번 들어오면 지금 층에서 계속 올라간다) */
    var floor = spec.floor
        private set
    var g: Float = difficulty()
        private set
    private var hpScale = rules.stageHp(g)
    private var atkScale = rules.stageAtk(g)
    var itemPower = rules.itemPower(g)
        private set
    /** 탑에서 층을 돌파하며 바로 받은 골드 */
    var towerGold = 0L
        private set

    private fun difficulty(): Float = when (mode) {
        Mode.STAGE -> rules.globalStage(spec.chapter, spec.stage).toFloat()
        Mode.TOWER -> floor * 1.6f
        Mode.WORLD_BOSS -> 6f + progress.power() / 900f
    }
    var tutorial = if (mode == Mode.STAGE && spec.chapter == 0 && spec.stage == 0 && !save.tutorialDone) 0 else -1
    private var tutProduced = 0

    // 생산·성장
    val energyMax = data.forgeUpgrades.first { it.id == "energyMax" }.value(progress.forge("energyMax")).roundToInt()
    var energy = energyMax
    val regenEvery = data.forgeUpgrades.first { it.id == "energyRegen" }.value(progress.forge("energyRegen"))
    var regenT = 0f
    val autoEvery = if (progress.forge("autoMerge") > 0) data.forgeUpgrades.first { it.id == "autoMerge" }.value(progress.forge("autoMerge")) else 0f
    var autoT = 0f
    private val tier2Chance = progress.forge("startTier") * 0.08f
    private val doubleChance = progress.smith("double") * 0.06f
    private val lineRates = rules.lineRates(progress.smith("weaponRate"))
    val feverDur = data.smithUpgrades.first { it.id == "fever" }.value(progress.smith("fever"))
    val feverMax = data.balance.feverMax
    val railSpeed = if (mode == Mode.STAGE && spec.chapter == 2) 650f else 1500f

    val board = MergeBoard(Layout.COLS, Layout.ROWS, random, data.balance.maxTier).apply {
        // 공방 레벨로 해금된 단계까지만 합성된다
        mergeCap = rules.maxMergeTier(progress.workshopLevel())
    }
    val mergeCap get() = board.mergeCap
    var drag: Drag? = null
    val rail = ArrayList<RailItem>()
    private val chainQueue = ArrayList<ChainJob>()
    var combo = 0
    var comboT = 0f
    var feverGauge = 0f
    var feverT = 0f
    var feverCount = 0
    var smithT = 0f
    var boardShake = 0f
    var time = 0f
    var killGold = 0L
    var totalDamage = 0.0
    var lastTarget: CatUnit? = null
    var paused = false
    var result: BattleResult? = null
    var emergency: Emergency? = null
    var banner: Banner? = null
    var bossCut: BossCut? = null
    var legend: LegendShow? = null
    private var produced = 0

    var waves: List<Wave> = Waves.build(data, spec, random, game.now)
        private set
    var phase = Phase.INTRO
    var phaseT = 0f
    var breakDur = data.balance.breakSeconds
    var waveIdx = -1
    private val spawnQ = ArrayDeque<String>()
    private var spawnT = 0f
    var boss: Foe? = null
    var hpBarFoe: Foe? = null
    val timeLimit = data.balance.worldBossSeconds

    // ECS
    val cats = ArrayList<CatUnit>()
    val foes = ArrayList<Foe>()
    val projectiles = ArrayList<Projectile>()
    val world: World = configureWorld {
        injectables { add(this@Battle) }
        systems {
            add(CatSystem())
            add(FoeSystem())
            add(ProjectileSystem())
            add(CleanupSystem())
        }
    }

    init {
        val squad = save.squad.take(2).sortedByDescending { data.cat(it).melee }
        val xs = floatArrayOf(420f, 190f)
        squad.forEachIndexed { i, id ->
            val d = data.cat(id)
            val mul = rules.catMul(progress.catLevel(id))
            val c = CatUnit(d, xs[i], Layout.GROUND, d.hp * mul, d.atk * mul)
            cats += c
            world.entity { it += c }
        }
        if (tutorial == 0) {
            board[16].item = board.newItem(Line.weapon, 1)
            board[18].item = board.newItem(Line.weapon, 1)
        } else {
            val start = listOf(Line.weapon to 1, Line.weapon to 1, Line.armor to 1, Line.armor to 1, Line.consumable to 1, Line.special to 1, Line.weapon to 2)
            val cells = (0 until board.size).shuffled(random)
            start.forEachIndexed { i, (l, t) -> board[cells[i]].item = board.newItem(l, t) }
            board[cells[7]].item = board.newChest()
        }
        board.cells.forEach { it.item?.pop = 0.35f }
    }

    fun title() = if (mode == Mode.TOWER) spec.copy(floor = floor).title(data) else spec.title(data)
    fun dispose() = world.dispose()

    private fun banner(text: String, color: Color, sub: String = "") { banner = Banner(text, color, sub) }

    // ================= 웨이브 =================
    fun startWave(i: Int) {
        waveIdx = i
        val w = waves[i]
        phase = Phase.WAVE
        phaseT = 0f
        spawnQ.clear()
        when {
            w.boss != null -> {
                spawnQ.addAll(w.minions)
                spawnT = 3.2f
                spawnBoss(w)
            }
            w.elite != null -> {
                spawnQ.addAll(w.minions)
                spawnT = 1.5f
                spawnEnemy(w.elite!!, elite = true)
                banner("정예 몬스터 등장!", ORANGE_BANNER)
                audio.play("warn")
            }
            else -> {
                spawnQ.addAll(w.list)
                spawnT = 0.2f
                banner("WAVE ${i + 1}", Color.WHITE)
                audio.play("wave")
            }
        }
    }

    fun spawnEnemy(id: String, elite: Boolean = false, atX: Float = Float.NaN): Foe {
        val d = data.enemy(id)
        val wm = rules.waveMul(waveIdx)
        val hp = d.hp * hpScale * (if (elite) data.balance.eliteHp else 1f) * wm
        val f = Foe(
            enemy = d, bossDef = null, name = (if (elite) "정예 " else "") + d.name,
            x = if (atX.isNaN()) rnd(1160f, 1240f) else atX,
            y = Layout.GROUND - (if (d.fly) 150f else 0f) + rnd(-8f, 8f),
            hp = hp.toDouble(), atk = d.atk * atkScale * (if (elite) data.balance.eliteAtk else 1f) * wm,
            scale = d.scale * (if (elite) 1.45f else 1f), speed = d.speed * rnd(0.9f, 1.1f), elite = elite,
        )
        foes += f
        world.entity { it += f }
        if (elite) hpBarFoe = f
        return f
    }

    private fun spawnBoss(w: Wave) {
        val d = data.boss(w.boss!!)
        val hp = if (d.world) d.hp else d.hp * hpScale * (if (w.mid) 0.45 else 1.0) * (if (mode == Mode.TOWER) 0.8 else 1.0)
        val b = Foe(
            enemy = null, bossDef = d, name = (if (w.mid) "부하 " else "") + d.name,
            x = 1300f, y = Layout.GROUND - (if (d.fly) 120f else 0f), hp = hp,
            atk = d.atk * atkScale * (if (w.mid) 0.7f else 1f), scale = d.scale * (if (w.mid) 0.8f else 1f), speed = 260f, mid = w.mid,
        )
        if (!d.world) b.thresholds += if (w.mid) listOf(0.5f) else listOf(0.7f, 0.3f)
        if (w.mid) b.patterns = listOf(d.patterns.first())
        boss = b
        hpBarFoe = b
        foes += b
        world.entity { it += b }
        bossCut = BossCut(b.name, d.tip, d.atkId)
        fx.shake(28f)
        fx.flash(BOSS_FLASH, 0.5f)
        audio.play("roar")
        audio.music("boss")
    }

    // ================= 보드 =================
    fun canUse(i: Int) = board.canUse(i)

    fun produce(free: Boolean = false) {
        if (result != null || tutorial == 0 || tutorial == 1) return
        if (!free && energy < 1) {
            game.toast.show("에너지가 부족해요!", Gfx.GOLD)
            audio.play("full")
            return
        }
        val empty = board.emptyCells().toMutableList()
        if (empty.isEmpty()) {
            if (!free) {
                game.toast.show("보드가 가득 찼어요! 먼저 합성하세요", SALMON)
                audio.play("full")
                boardShake = 0.3f
            }
            return
        }
        if (!free) energy -= 1
        smithT = 0.36f
        audio.play("produce")
        fx.sparks(210f, 1840f, SPARK, 14, -PI.toFloat() / 2, 1.6f)
        val count = if (random.nextFloat() < doubleChance) 2 else 1
        for (k in 0 until count) {
            if (empty.isEmpty()) break
            val idx = empty.removeAt(random.nextInt(empty.size))
            produced++
            val item = if (produced % 18 == 0) board.newChest()
            else board.newItem(board.rollLine(lineRates), if (random.nextFloat() < tier2Chance) 2 else 1)
            if (!item.chest) progress.recordTier(item.line, item.tier)
            item.flyT = 0.32f + k * 0.08f
            item.flyMax = item.flyT
            item.pop = 0f
            board[idx].item = item
        }
        if (tutorial == 2) {
            tutProduced++
            if (tutProduced >= 3) advanceTutorial()
        }
    }

    private fun onMerged(cell: Int, chain: Boolean, depth: Int, chests: List<Int>) {
        val it = board[cell].item ?: return
        it.pop = 0.4f
        progress.recordTier(it.line, it.tier)
        val cx = Layout.cellCx(cell)
        val cy = Layout.cellCy(cell)
        combo = if (comboT > 0f) combo + 1 else 1
        comboT = 2.5f
        addFever(if (chain) 2f else 1f)
        val col = Gfx.lineColor(it.line)
        fx.sprite("ui/merge-glow", cx, cy, 250f, 258f, 0.45f, 0.4f, 1.3f, additive = true)
        fx.burst(cx, cy, col, 18, 700f, 12f, 0.45f)
        fx.stars(cx, cy, 5, 380f, 34f)
        fx.ring(cx, cy, col, 150f, 0.35f, 14f)
        if (chain) {
            audio.play("chain", audio.comboPitch(depth + combo))
            fx.number(cx, cy - 40f, "연쇄 x${depth + 1}!", 54f, CHAIN_YELLOW, 1f)
            fx.shake(6f + depth * 3f)
        } else {
            audio.play("merge", audio.comboPitch(combo))
            if (combo >= 2) fx.number(cx, cy - 30f, "$combo COMBO", 40f, COMBO_CREAM)
            fx.shake(3f)
        }
        chests.forEach { n ->
            val nx = Layout.cellCx(n)
            val ny = Layout.cellCy(n)
            board[n].item?.pop = 0.4f
            fx.burst(nx, ny, Gfx.GOLD, 24, 800f, 14f, 0.5f)
            fx.stars(nx, ny, 8, 450f, 40f)
            fx.number(nx, ny - 30f, "상자 오픈!", 40f, Gfx.GOLD)
            audio.play("chest")
        }
        if (it.tier == board.maxTier && save.legend[it.line.name] != true) {
            save.legend[it.line.name] = true
            game.persist()
            legend = LegendShow(it.line)
            audio.play("legend")
            fx.flash(LEGEND_FLASH, 0.9f)
        }
        if (it.tier < board.mergeCap) chainQueue += ChainJob(cell, 0.24f, depth + 1, it.uid)
        if (tutorial == 0) advanceTutorial()
    }

    private fun processChains(dt: Float) {
        chainQueue.forEach { it.t -= dt }
        val ready = chainQueue.filter { it.t <= 0f }
        chainQueue.removeAll { it.t <= 0f }
        for (job in ready) {
            val it = board[job.cell].item ?: continue
            if (it.uid != job.uid || drag?.item === it) continue
            val partner = board.chainPartner(job.cell, drag?.from ?: -1) ?: continue
            val moving = board[partner].item!!
            flyGhost(moving, partner, job.cell, 0.14f)
            val r = board.applyChain(job.cell, partner)
            onMerged(r.cell, true, job.depth, r.chestsOpened)
        }
    }

    private fun flyGhost(item: BoardItem, from: Int, to: Int, life: Float) {
        val fx0 = Layout.cellCx(from)
        val fy0 = Layout.cellCy(from)
        fx.p {
            x = fx0; y = fy0; img = "items/${item.line.name}-${item.tier}"; size = 90f; this.life = life
            vx = (Layout.cellCx(to) - fx0) / life; vy = (Layout.cellCy(to) - fy0) / life; drag = 1f; additive = false; shrink = false
        }
    }

    private fun addFever(n: Float) {
        if (feverT > 0f) return
        feverGauge += n
        if (feverGauge >= feverMax) {
            feverGauge = 0f
            feverT = feverDur
            feverCount++
            audio.play("fever")
            audio.music("fever")
            fx.flash(FEVER_FLASH, 0.55f)
            fx.shake(22f)
            banner("FEVER TIME!", FEVER_YELLOW, "공격력 2배 · 광폭화")
            cats.filter { !it.isDown }.forEach {
                fx.ring(it.x, it.y - 120f, FEVER_RING, 260f, 0.6f, 26f)
                fx.burst(it.x, it.y - 120f, SPARK, 30, 900f, 14f, 0.7f)
            }
        }
    }

    // ================= 보급 =================
    fun autoTarget(line: Line, tier: Int): CatUnit? {
        if (cats.isEmpty() || line == Line.special) return null
        val alive = cats.filter { !it.isDown }
        if (line == Line.consumable) {
            alive.firstOrNull { it.id == Rules.HEALER }?.let { return it }
            cats.firstOrNull { it.isDown }?.let { return it }
            return alive.minByOrNull { it.hp / it.maxHp } ?: cats.first()
        }
        val pool = alive.ifEmpty { cats }
        if (line == Line.armor) {
            val tank = pool.firstOrNull { it.id == Rules.TANK }
            if (tank != null && tank.armor < tier) return tank
            return pool.sortedWith(compareBy<CatUnit> { it.armor }.thenByDescending { it.x }).first()
        }
        val dealers = pool.filter { it.def.prefer == Line.weapon }.ifEmpty { pool }
        return dealers.minBy { it.weapon }
    }

    fun catAt(x: Float, y: Float): CatUnit? = cats.firstOrNull { abs(x - it.x) < 110f && y > it.y - 280f && y < it.y + 30f }

    private fun supply(item: BoardItem, x: Float, y: Float, direct: CatUnit?) {
        val target = direct ?: autoTarget(item.line, item.tier)
        lastTarget = target
        audio.play("supply")
        emergency?.let {
            if (!it.supplied) {
                it.supplied = true
                fx.slow(0.6f, 0.3f)
                fx.flash(Color.WHITE, 0.5f)
                banner("긴급 보급 성공!", Gfx.MINT, "반격 준비!")
            }
        }
        val b = boss
        if (b != null && b.riddle == item.line) {
            b.riddle = null
            b.stun = 2.5f
            fx.burst(b.x, b.y - 200f, Gfx.GOLD, 40, 1000f, 16f, 0.7f)
            banner("수수께끼 해제!", Gfx.GOLD, "보스가 기절했어요")
            audio.play("chest")
        }
        rail += if (direct != null) RailItem(item, x, y, target, true).apply { flyDur = 0.25f }
        else RailItem(item, x, Layout.RAIL_CY, target, false)
        if (tutorial == 1) advanceTutorial()
    }

    private fun updateRail(dt: Float) {
        for (r in rail) {
            r.t += dt
            if (!r.flying) {
                r.x += railSpeed * dt
                if (random.nextFloat() < 0.6f) {
                    val col = Gfx.lineColor(r.item.line)
                    fx.p { x = r.x - 40f; y = r.y + rnd(-20f, 20f); vx = -200f; size = rnd(4f, 8f); color.set(col); life = 0.3f }
                }
                if (r.x >= Layout.RAIL_X1) {
                    r.flying = true; r.sx = r.x; r.sy = r.y; r.t = 0f; r.flyDur = 0.42f
                }
            } else {
                val k = min(1f, r.t / r.flyDur)
                val tgt = r.target
                val tx = tgt?.x ?: 720f
                val ty = if (tgt != null) tgt.y - 130f else 420f
                val mx = (r.sx + tx) / 2
                val my = min(r.sy, ty) - 220f
                r.x = (1 - k) * (1 - k) * r.sx + 2 * (1 - k) * k * mx + k * k * tx
                r.y = (1 - k) * (1 - k) * r.sy + 2 * (1 - k) * k * my + k * k * ty
                val col = Gfx.lineColor(r.item.line)
                fx.p { x = r.x; y = r.y; size = rnd(8f, 14f); color.set(col); life = 0.35f }
                if (k >= 1f) {
                    r.done = true
                    applySupply(r.item, tgt, tx, ty)
                }
            }
        }
        rail.removeAll { it.done }
    }

    private fun applySupply(item: BoardItem, cat: CatUnit?, x: Float, y: Float) {
        val v = rules.itemValue(item.line, item.tier) * itemPower
        val col = Gfx.lineColor(item.line)
        if (item.line == Line.special) {
            val dmg = v * (if (feverT > 0f) 2f else 1f)
            fx.flash(if (item.tier >= 5) ICE_FLASH else PINK_FLASH, 0.35f + item.tier * 0.05f)
            fx.shake(10f + item.tier * 4f)
            fx.stop(0.05f + item.tier * 0.01f)
            fx.ring(x, y, col, 500f + item.tier * 60f, 0.6f, 40f)
            fx.burst(x, y, col, 40 + item.tier * 6, 1400f, 18f, 0.7f)
            fx.stars(x, y, 10, 700f, 50f)
            audio.play(if (item.tier >= 5) "zap" else "boom")
            if (item.tier >= 4) audio.play("boom")
            val boltColor = when (item.tier) { 6 -> ICE_BOLT; 4 -> FIRE_BOLT; else -> VIOLET_BOLT }
            foes.toList().forEach { e ->
                if (item.tier >= 4) fx.bolt(e.x + rnd(-40f, 40f), -40f, e.x, e.y - 80f, boltColor)
                damageFoe(e, dmg, magic = true, crit = item.tier >= 6, special = true)
            }
            fx.number(x, y - 60f, "${data.itemName(item.line, item.tier)}!", 58f, Color.WHITE, 1.1f)
            return
        }
        if (cat == null) return
        val tank = cat.id == Rules.TANK
        cat.flash = 1f
        fx.sprite("ui/merge-glow", cat.x, cat.y - 130f, 260f, 270f, 0.45f, 0.5f, 1.2f)
        fx.burst(cat.x, cat.y - 130f, col, 26, 800f, 13f, 0.55f)
        fx.ring(cat.x, cat.y - 120f, col, 200f, 0.4f, 16f)
        audio.play("equip")
        when (item.line) {
            Line.weapon -> if (item.tier > cat.weapon) {
                val refund = if (cat.weapon > 0) rules.refundGold(cat.weapon) else 0
                cat.weapon = item.tier
                fx.number(cat.x, cat.y - 300f, "공격력 +${v.roundToInt()}", 50f, WEAPON_TEXT, 1.2f)
                if (refund > 0) gainGold(refund.toLong(), cat.x, cat.y - 200f)
            } else {
                fx.number(cat.x, cat.y - 300f, "이미 더 좋은 무기!", 38f)
                gainGold(rules.refundGold(item.tier).toLong(), cat.x, cat.y - 200f)
            }
            Line.armor -> if (item.tier > cat.armor) {
                val refund = if (cat.armor > 0) rules.refundGold(cat.armor) else 0
                cat.armor = item.tier
                recalcHp(cat)
                fx.number(cat.x, cat.y - 300f, "방어력 +${(rules.itemValue(Line.armor, item.tier) * if (tank) 1.5f else 1f).roundToInt()}", 50f, ARMOR_TEXT, 1.2f)
                if (refund > 0) gainGold(refund.toLong(), cat.x, cat.y - 200f)
            } else {
                fx.number(cat.x, cat.y - 300f, "이미 더 좋은 방어구!", 38f)
                gainGold(rules.refundGold(item.tier).toLong(), cat.x, cat.y - 200f)
            }
            Line.consumable -> {
                val spread = cat.id == Rules.HEALER
                val targets = if (spread) cats else listOf(cat)
                audio.play("heal")
                for (t in targets) {
                    val amt = v * if (spread) 1.2f else 1.4f
                    if (t.isDown) {
                        t.down = 0f
                        t.hp = 0f
                        fx.number(t.x, t.y - 340f, "부활!", 56f, Gfx.MINT)
                    }
                    t.hp = min(t.maxHp, t.hp + amt)
                    t.poisonT = 0f
                    if (item.tier >= 3) t.buffT = 6f + item.tier
                    fx.sprite("ui/healing-aura", t.x, t.y - 120f, 300f, 290f, 0.8f, 0.7f, 1.2f)
                    fx.number(t.x, t.y - 260f, "+${amt.roundToInt()}", 50f, Gfx.MINT)
                    repeat(10) {
                        fx.p { this.x = t.x + rnd(-80f, 80f); this.y = t.y - rnd(0f, 100f); vy = rnd(-300f, -120f); size = rnd(6f, 11f); color.set(HEAL_DOT); life = 0.8f; drag = 0.97f }
                    }
                }
                if (item.tier >= 3) fx.number(cat.x, cat.y - 330f, "공격 버프!", 40f, CHAIN_YELLOW)
            }
            Line.special -> Unit
        }
    }

    fun recalcHp(c: CatUnit) {
        val newMax = c.baseHp + rules.catArmorHp(c.def, c.armor, itemPower)
        c.hp += newMax - c.maxHp
        c.maxHp = newMax
        c.hp = c.hp.coerceIn(1f, c.maxHp)
    }

    fun gainGold(n: Long, x: Float, y: Float) {
        killGold += n
        fx.collect(x, y, "icons/gold", 650f, 150f, min(8, 1 + (n / 4).toInt()), false) { audio.play("coin") }
    }

    // ================= 전투 계산 =================
    fun catAtk(c: CatUnit): Float {
        var a = c.baseAtk + if (c.weapon > 0) rules.itemValue(Line.weapon, c.weapon) * itemPower * (if (c.shockT > 0f) 0.5f else 1f) else 0f
        if (feverT > 0f) a *= 2f
        if (c.buffT > 0f) a *= 1.3f
        if (c.rageT > 0f) a *= 2f
        return a
    }

    fun enemyTarget(): CatUnit? {
        val alive = cats.filter { !it.isDown }
        if (alive.isEmpty()) return null
        return alive.firstOrNull { it.id == Rules.TANK } ?: alive.maxBy { it.x }
    }

    fun damageFoe(e: Foe, raw: Float, crit: Boolean = false, magic: Boolean = false, melee: Boolean = false, special: Boolean = false) {
        if (e.dead || e.state == FoeState.ENTER) return
        var dmg = raw.toDouble()
        if (e.shield && !magic) dmg *= data.balance.shieldFactor
        if (e.armorR > 0f) dmg *= 1 - e.armorR
        val bd = e.bossDef
        if (bd != null) {
            if (bd.meleeHalf && melee) dmg *= 0.5
            if (bd.harden) dmg *= max(0.35, 1.0 - time / 140.0)
            if (e.riddle != null) dmg *= 0.1
            if (e.shieldHp > 0) {
                val sd = dmg * if (magic) 2 else 1
                e.shieldHp -= sd
                fx.burst(e.x, e.y - 200f, SHIELD, 6, 400f, 8f, 0.3f)
                if (e.shieldHp <= 0) {
                    e.shieldHp = 0.0
                    fx.ring(e.x, e.y - 200f, SHIELD, 400f, 0.5f, 30f)
                    fx.shake(18f)
                    banner("보호막 파괴!", SHIELD)
                    audio.play("boom")
                }
                fx.number(e.x, e.y - e.scale * 380f, sd.roundToLong().toString(), 36f, SHIELD)
                return
            }
        }
        dmg = max(1.0, dmg * rnd(0.92f, 1.08f))
        e.hp -= dmg
        totalDamage += dmg
        e.flash = 1f
        if (!e.isBoss) e.knock = min(40f, e.knock + if (crit) 40f else 14f)
        val top = e.y - (if (e.isBoss) 330f else 200f) * e.scale
        val big = crit || special
        val color = when {
            feverT > 0f -> FEVER_NUMBER
            crit -> CRIT_NUMBER
            magic -> MAGIC_NUMBER
            else -> Color.WHITE
        }
        fx.number(e.x + rnd(-20f, 20f), top, fmtDmg(dmg), if (big) 64f else 42f, color, vy = if (big) -380f else -260f, glow = feverT > 0f)
        if (crit) {
            fx.shake(8f)
            fx.stop(0.045f)
            fx.number(e.x, top - 60f, "CRITICAL!", 34f, CRIT_LABEL, 0.7f)
        }
        if (bd != null && e.hp > 0 && !e.world) {
            val ratio = (e.hp / e.maxHp).toFloat()
            if (e.thresholds.isNotEmpty() && ratio <= e.thresholds.first()) {
                e.thresholds.removeAt(0)
                bossPattern(e)
            }
        }
        if (e.hp <= 0 && !e.world) killFoe(e)
    }

    private fun fmtDmg(d: Double) = "%,d".format(d.roundToLong())
    private fun Double.roundToLong() = kotlin.math.round(this).toLong()

    private val delayed = ArrayList<Pair<Float, () -> Unit>>()

    fun killFoe(e: Foe) {
        if (e.dead) return
        e.dead = true
        e.deadT = 0f
        val baseGold = e.enemy?.gold ?: 30
        val gold = (baseGold * (1 + g * 0.08f) * (if (e.elite) 6f else 1f) * (if (e.isBoss) (if (e.mid) 8f else 20f) else 1f)).roundToInt().toLong()
        if (e.isBoss) {
            fx.slow(1.6f, 0.2f)
            fx.flash(Color.WHITE, 1f)
            fx.shake(45f)
            fx.punch(e.x, e.y - 200f, 0.6f)
            audio.play("bigboom")
            repeat(5) { i ->
                delayed += (i * 0.16f) to {
                    fx.burst(e.x + rnd(-120f, 120f), e.y - rnd(80f, 320f), listOf(SPARK, WEAPON_TEXT, Color.WHITE).random(), 40, 1200f, 20f, 0.8f)
                    audio.play("boom")
                }
            }
            fx.ring(e.x, e.y - 200f, Gfx.GOLD, 700f, 0.8f, 50f)
            killGold += gold
            fx.collect(e.x, e.y - 200f, "icons/gold", 650f, 150f, 30, false) { audio.play("coin") }
            fx.p {
                x = e.x; y = e.y - 300f; vx = -150f; vy = -700f; g = 1800f; img = "icons/chest"; size = 150f
                life = 3f; additive = false; shrink = false; floor = Layout.GROUND - 60f; fade = false
            }
            spawnQ.clear()
            emergency = null
            foes.filter { it !== e && !it.dead }.forEach { killFoe(it) }
            hpBarFoe = null
        } else {
            audio.play("die")
            fx.burst(e.x, e.y - 80f, DEATH_WHITE, 16, 600f, 12f, 0.45f)
            fx.smoke(e.x, e.y - 40f, 5)
            fx.sparks(e.x, e.y - 80f, SPARK, 8, -PI.toFloat() / 2, 2.5f)
            gainGold(gold, e.x, e.y - 80f)
            if (e.elite) {
                fx.shake(20f)
                fx.slow(0.4f, 0.3f)
                hpBarFoe = null
            }
        }
        if (feverT <= 0f) feverGauge = min(feverMax - 0.01f, feverGauge + 0.15f)
    }

    fun damageCat(c: CatUnit, raw: Float) {
        if (c.isDown) return
        val dmg = rules.damageTaken(raw, rules.catDefense(c.def, c.armor))
        c.hp -= dmg
        c.flash = 0.8f
        c.sq = 0.12f
        fx.number(c.x + rnd(-20f, 20f), c.y - 240f, dmg.roundToInt().toString(), 36f, HURT, vy = -200f)
        if (c.hp <= 0f) {
            c.hp = 0f
            c.down = data.balance.catReviveSeconds
            fx.burst(c.x, c.y - 100f, Color.WHITE, 20, 600f, 12f, 0.5f)
            fx.shake(16f)
            audio.play("meow")
            fx.number(c.x, c.y - 300f, "${c.def.name} 쓰러짐!", 40f, SALMON, 1.3f)
            game.platform.services.vibrate(80)
        }
    }

    // ================= 고양이 행동 (CatSystem) =================
    fun updateCat(c: CatUnit, dt: Float) {
        val fever = feverT > 0f
        c.flash = max(0f, c.flash - dt * 4f)
        c.sq = max(0f, c.sq - dt)
        c.lunge = max(0f, c.lunge - dt * 120f)
        if (c.buffT > 0f) c.buffT -= dt
        if (c.rageT > 0f) c.rageT -= dt
        if (c.shockT > 0f) c.shockT -= dt
        // 앞줄이 쓰러지면 뒷줄이 전진, 근접은 멀리 멈춰 선 적에게 돌진
        val front = cats.first()
        var wantX = if (c !== front && front.isDown) front.homeX else c.homeX
        if (c.def.melee && !c.isDown && c.state != CatState.ATTACK && findTarget(c) == null) {
            val near = foes.filter { !it.dead && it.state != FoeState.ENTER && it.x < 1060f }.minByOrNull { it.x }
            if (near != null && near.state != FoeState.WALK) wantX = min(near.x - c.def.range + 30f, 820f)
        }
        if (c.state != CatState.ATTACK && abs(c.x - wantX) > 2f) c.x += sign(wantX - c.x) * min(abs(wantX - c.x), 320f * dt)
        if (c.isDown) {
            c.down -= dt
            if (c.down <= 0f) {
                c.down = 0f
                c.hp = c.maxHp * 0.4f
                fx.burst(c.x, c.y - 100f, Gfx.MINT, 20, 500f, 12f, 0.5f)
                fx.number(c.x, c.y - 300f, "다시 일어났다냥!", 38f, Gfx.MINT)
            }
            return
        }
        if (c.poisonT > 0f) {
            c.poisonT -= dt
            c.hp -= c.poisonDps * dt
            if (random.nextFloat() < 0.15f) fx.p { x = c.x + rnd(-50f, 50f); y = c.y - rnd(40f, 200f); vy = -120f; size = rnd(8f, 14f); color.set(POISON); life = 0.6f }
            if (c.hp <= 0f) { c.hp = 0.01f; damageCat(c, 1000f) }
        }
        if (c.id == Rules.HEALER) {
            c.healT -= dt
            if (c.healT <= 0f) {
                c.healT = 2.6f
                val t = cats.filter { !it.isDown && it.hp < it.maxHp }.minByOrNull { it.hp / it.maxHp }
                if (t != null) {
                    val amt = c.def.heal * rules.catMul(progress.catLevel(Rules.HEALER)) * (1 + g * 0.06f)
                    t.hp = min(t.maxHp, t.hp + amt)
                    fx.sprite("ui/healing-aura", t.x, t.y - 120f, 260f, 250f, 0.6f)
                    fx.number(t.x, t.y - 250f, "+${amt.roundToInt()}", 34f, Gfx.MINT)
                }
            }
        }
        c.animT += dt
        if (c.state == CatState.ATTACK) {
            val speed = if (fever) 1.5f else 1f
            val prep = 0.22f / speed
            val strike = 0.14f / speed
            if (!c.struck && c.animT >= prep) {
                c.struck = true
                c.lunge = if (c.def.melee) 40f else 14f
                catStrike(c)
            }
            if (c.animT >= prep + strike) {
                c.state = CatState.IDLE
                c.animT = 0f
            }
            return
        }
        c.cd -= dt * (if (fever) 1.5f else 1f) * (if (c.rageT > 0f) 1.4f else 1f)
        if (c.cd <= 0f) {
            val t = findTarget(c)
            if (t != null) {
                c.state = CatState.ATTACK
                c.animT = 0f
                c.struck = false
                c.target = t
                c.cd = c.def.cd
            } else c.cd = 0.1f
        }
    }

    fun findTarget(c: CatUnit): Foe? {
        var best: Foe? = null
        for (e in foes) {
            if (e.dead || e.state == FoeState.ENTER || e.x > 1070f) continue
            val dist = e.x - c.x
            val reach = if (c.def.melee) c.def.range + (if (e.isBoss) 250f * e.scale else 40f) else c.def.range
            if (dist < -60f || dist > reach) continue
            if (best == null || e.x < best.x) best = e
        }
        return best
    }

    private fun catStrike(c: CatUnit) {
        val e = c.target ?: return
        if (e.dead) return
        val crit = random.nextFloat() < c.def.crit + if (feverT > 0f) 0.15f else 0f
        val dmg = catAtk(c) * if (crit) 2.2f else 1f
        val ex = e.x - 30f
        val ey = e.y - 140f * e.scale - 30f
        when {
            c.def.melee -> {
                damageFoe(e, dmg, crit = crit, melee = true)
                val s = if (crit) 1.3f else 1f
                fx.sprite("ui/sword-arc", ex - 20f, ey, 260f * s, 250f * s, 0.24f, 0.7f, 1.1f, rot = rnd(-17f, 17f))
                fx.sparks(ex, ey, if (crit) CHAIN_YELLOW else SLASH_SPARK, if (crit) 16 else 8, 0f, 1.4f)
                audio.play(if (crit) "crit" else "slash")
                audio.play("hit")
                if (c.id == Rules.TANK) fx.ring(ex, ey, SLASH_SPARK, 120f, 0.25f, 12f)
            }
            c.id == "archer" -> {
                addProjectile(Projectile(ProjKind.ARROW, c.x + 90f, c.y - 150f, 2400f, dmg, ARROW, foe = e, crit = crit))
                audio.play("arrow")
            }
            c.id == "wizard" -> {
                addProjectile(Projectile(ProjKind.FIRE, c.x + 110f, c.y - 200f, 1300f, dmg, FIRE, foe = e, crit = crit, magic = true, aoe = c.def.aoe))
                audio.play("fire")
            }
            else -> addProjectile(Projectile(ProjKind.HOLY, c.x + 100f, c.y - 170f, 1500f, dmg, HEAL_DOT, foe = e, crit = crit, magic = true))
        }
    }

    private fun addProjectile(p: Projectile) {
        projectiles += p
        world.entity { it += p }
    }

    // ================= 투사체 (ProjectileSystem) =================
    fun updateProjectile(p: Projectile, dt: Float) {
        if (p.done) return
        val f = p.foe
        val c = p.cat
        val tx: Float
        val ty: Float
        if (f != null) { tx = f.x - 20f; ty = f.y - 140f * f.scale } else if (c != null) { tx = c.x; ty = c.y - 120f } else { tx = p.x + 100f; ty = p.y }
        val alive = (f != null && !f.dead) || (c != null && !c.isDown)
        if (alive || p.lx.isNaN()) { p.lx = tx; p.ly = ty }
        val dx = p.lx - p.x
        val dy = p.ly - p.y
        val d = hypot(dx, dy)
        val step = p.speed * dt
        p.ang = atan2(dy, dx)
        if (d <= step) {
            p.done = true
            if (p.hostile) hostileHit(p) else projectileHit(p)
            return
        }
        p.x += dx / d * step
        p.y += dy / d * step
        when (p.kind) {
            ProjKind.FIRE -> fx.p { x = p.x; y = p.y; vx = rnd(-60f, 60f); vy = rnd(-60f, 60f); size = rnd(14f, 24f); color.set(listOf(FIRE, SPARK, FIRE_DEEP).random()); life = 0.3f }
            ProjKind.HOLY -> fx.p { x = p.x; y = p.y; size = rnd(8f, 14f); color.set(HEAL_DOT); life = 0.25f }
            ProjKind.SPORE -> fx.p { x = p.x; y = p.y; size = rnd(8f, 14f); color.set(p.color); life = 0.3f }
            ProjKind.ARROW -> fx.p { x = p.x; y = p.y; size = 4f; color.set(Color.WHITE); life = 0.12f }
        }
    }

    private fun projectileHit(p: Projectile) {
        val e = p.foe
        if (p.aoe > 0f) {
            fx.burst(p.x, p.y, FIRE, 26, 900f, 18f, 0.5f)
            fx.ring(p.x, p.y, EMBER, p.aoe * 1.2f, 0.4f, 24f)
            fx.smoke(p.x, p.y, 4, ASH)
            fx.shake(if (p.crit) 12f else 6f)
            audio.play("boom")
            foes.toList().forEach { o ->
                if (!o.dead && abs(o.x - p.x) < p.aoe) damageFoe(o, p.dmg * if (o === e) 1f else 0.7f, crit = p.crit, magic = true)
            }
            return
        }
        if (e == null || e.dead) return
        fx.burst(p.x, p.y, p.color, 10, 500f, 9f, 0.3f)
        if (p.kind == ProjKind.ARROW) fx.sparks(p.x, p.y, ARROW, if (p.crit) 14 else 6, 0f, 1.2f)
        audio.play(if (p.crit) "crit" else "hit")
        damageFoe(e, p.dmg, crit = p.crit, magic = p.magic)
    }

    private fun hostileHit(p: Projectile) {
        val c = p.cat
        fx.burst(p.x, p.y, p.color, 10, 400f, 10f, 0.3f)
        if (c == null || c.isDown) return
        damageCat(c, p.dmg)
        if (p.poison) { c.poisonT = 3f; c.poisonDps = p.dmg * 0.25f }
        audio.play("enemyhit")
    }

    // ================= 몬스터 행동 (FoeSystem) =================
    private var frameTarget: CatUnit? = null

    fun beginFoeFrame() {
        frameTarget = enemyTarget()
        foes.filter { !it.dead && !it.isBoss && it.ranged <= 0f }.sortedBy { it.x }.forEachIndexed { i, e -> e.queue = i }
    }

    fun updateFoe(e: Foe, dt: Float) {
        e.flash = max(0f, e.flash - dt * 5f)
        if (e.dead) { e.deadT += dt; return }
        if (e.spawnT > 0f) e.spawnT -= dt
        e.animT += dt
        if (e.knock > 0f) { e.x += e.knock * dt * 8f; e.knock = max(0f, e.knock - dt * 200f) }
        val target = frameTarget
        if (e.isBoss) { updateBoss(e, dt, target); return }
        if (target == null) { e.state = FoeState.WALK; e.x -= e.speed * dt * 0.3f; return }
        val stopX = min(980f, if (e.ranged > 0f) target.homeX + e.ranged else target.x + 150f + e.queue * 60f)
        if (e.state == FoeState.ATTACK) {
            if (!e.struck && e.animT >= 0.22f) { e.struck = true; foeStrike(e, target) }
            if (e.animT >= 0.36f) { e.state = FoeState.FIGHT; e.animT = 0f }
            return
        }
        if (e.x > stopX) {
            e.state = FoeState.WALK
            e.x = max(stopX, e.x - e.speed * dt)
        } else {
            e.state = FoeState.FIGHT
            e.cd -= dt
            val inRange = e.ranged > 0f || e.x - target.x < 330f
            if (e.cd <= 0f && inRange) {
                e.state = FoeState.ATTACK
                e.animT = 0f
                e.struck = false
                e.cd = e.cdBase * rnd(0.9f, 1.2f)
            }
        }
    }

    private fun foeStrike(e: Foe, target: CatUnit) {
        val poison = e.enemy?.poison == true
        if (e.ranged > 0f) {
            addProjectile(Projectile(ProjKind.SPORE, e.x - 60f, e.y - 120f * e.scale, 1100f, e.atk, if (poison) SPORE_POISON else SPORE, cat = target, poison = poison))
        } else {
            damageCat(target, e.atk)
            if (poison) { target.poisonT = 3f; target.poisonDps = e.atk * 0.3f }
            fx.sparks(target.x + 60f, target.y - 120f, Color.WHITE, 5, PI.toFloat(), 1f)
            audio.play("enemyhit")
        }
    }

    private fun updateBoss(b: Foe, dt: Float, target: CatUnit?) {
        if (b.state == FoeState.ENTER) {
            val home = 590f + 190f * b.scale
            b.x -= 380f * dt
            if (random.nextFloat() < 0.3f) fx.smoke(b.x + 60f, b.y, 1)
            if (b.x <= home) {
                b.x = home
                b.homeX = home
                b.state = FoeState.FIGHT
                fx.shake(20f)
                fx.smoke(b.x, b.y, 10)
                audio.play("boom")
            }
            return
        }
        if (b.stun > 0f) {
            b.stun -= dt
            if (random.nextFloat() < 0.2f) fx.p { x = b.x + rnd(-60f, 60f); y = b.y - 360f * b.scale; vy = -60f; img = "icons/star"; size = 30f; life = 0.6f; additive = false }
            return
        }
        if (b.rageT > 0f) {
            b.rageT -= dt
            if (random.nextFloat() < 0.4f) fx.p { x = b.x + rnd(-100f, 100f); y = b.y - rnd(0f, 300f); vy = -300f; size = rnd(10f, 20f); color.set(RAGE); life = 0.5f }
        }
        val dash = b.dash
        if (dash != null) {
            dash.t += dt
            when {
                dash.t < 0.35f -> {
                    b.x = dash.from + (dash.to - dash.from) * easeOut(dash.t / 0.35f)
                    fx.smoke(b.x + 80f, b.y, 1)
                }
                !dash.hit -> {
                    dash.hit = true
                    val mult = if (dash.ok) 0.8f else 2.8f
                    cats.forEach { damageCat(it, b.atk * mult) }
                    fx.shake(if (dash.ok) 15f else 38f)
                    fx.stop(0.12f)
                    fx.flash(Color.WHITE, 0.4f)
                    fx.ring(b.x - 120f, b.y - 100f, SLASH_SPARK, 400f, 0.4f, 30f)
                    fx.sparks(b.x - 120f, b.y - 100f, Color.WHITE, 30, PI.toFloat(), 2f)
                    audio.play("bigboom")
                    game.platform.services.vibrate(150)
                    if (dash.ok) fx.number(b.x - 150f, b.y - 350f, "방어 성공!", 56f, Gfx.MINT)
                }
                dash.t < 1.2f -> {
                    val k = ((dash.t - 0.6f) / 0.6f).coerceAtLeast(0f)
                    b.x = dash.to + (b.homeX - dash.to) * easeOut(k)
                }
                else -> {
                    b.x = b.homeX
                    b.dash = null
                }
            }
            return
        }
        b.patternT -= dt
        if (b.patternT <= 0f) {
            b.patternT = if (b.world) 11f else 13f
            bossPattern(b)
        }
        if (b.world && b.bossDef?.id == "dog") {
            val n = (time / 28f).toInt()
            if (n > b.rageCount && n <= 3) {
                b.rageCount = n
                emergency = null
                execPattern(Emergency("rage", b))
                banner("암흑 광폭화!", RAGE)
            }
        }
        if (target == null) return
        if (b.state == FoeState.ATTACK) {
            if (!b.struck && b.animT >= 0.3f) {
                b.struck = true
                if (b.ranged > 0f) {
                    addProjectile(Projectile(ProjKind.SPORE, b.x - 120f, b.y - 220f * b.scale, 1000f, b.atk, POISON, cat = target, poison = true))
                } else {
                    damageCat(target, b.atk * if (b.rageT > 0f) 1.8f else 1f)
                    fx.shake(12f)
                    fx.sparks(target.x + 60f, target.y - 120f, Color.WHITE, 12, PI.toFloat(), 1.5f)
                    audio.play("crit")
                }
            }
            if (b.animT >= 0.5f) { b.state = FoeState.FIGHT; b.animT = 0f }
            return
        }
        b.cd -= dt * if (b.rageT > 0f) 1.7f else 1f
        if (b.cd <= 0f) {
            b.state = FoeState.ATTACK
            b.animT = 0f
            b.struck = false
            b.cd = b.cdBase
        }
    }

    // ================= 보스 패턴 =================
    private fun bossPattern(b: Foe) {
        if (emergency != null || result != null) return
        val p = b.patterns.random()
        emergency = Emergency(p, b)
        audio.play("warn")
        fx.flash(RAGE, 0.25f)
        val label = mapOf(
            "summon" to "쥐 떼 소환!", "charge" to "돌진 공격!", "poison" to "독 안개!", "riddle" to "수수께끼 버프!",
            "freeze" to "보드 빙결!", "armorbreak" to "방어구 파괴!", "suck" to "아이템 흡입!", "shieldup" to "보호막 전개!",
            "shock" to "전기 충격!", "rage" to "광폭화!",
        )[p] ?: p
        banner(label, WARN_RED, "긴급 보급으로 대응하세요!")
    }

    private fun execPattern(em: Emergency) {
        val b = em.boss
        val ok = em.supplied
        if (b.dead) return
        if (ok) cats.filter { !it.isDown }.forEach { it.rageT = 3.5f; fx.ring(it.x, it.y - 120f, Gfx.MINT, 220f, 0.5f, 20f) }
        val pool = if (mode == Mode.STAGE) data.chapters[spec.chapter].enemies else listOf("rat", "roach")
        when (em.pattern) {
            "summon" -> {
                repeat(if (ok) 2 else 4) { spawnEnemy(pool.random(), atX = b.x + rnd(-40f, 80f)).spawnT = 0.5f }
                fx.smoke(b.x, b.y - 30f, 12)
                audio.play("roar")
            }
            "charge" -> {
                val t = enemyTarget() ?: return
                b.dash = Dash(b.x, t.x + 170f, ok)
            }
            "poison" -> {
                if (!ok) cats.forEach { it.poisonT = 6f; it.poisonDps = b.atk * 0.55f }
                repeat(40) {
                    fx.p { x = rnd(0f, 700f); y = rnd(300f, 650f); vx = rnd(-60f, 60f); vy = rnd(-40f, 40f); size = rnd(40f, 90f); color.set(POISON_CLOUD); life = rnd(1f, 2f); additive = false; grow = true; drag = 0.98f }
                }
                audio.play("fire")
            }
            "riddle" -> {
                val line = Line.entries.random()
                b.riddle = line
                fx.ring(b.x, b.y - 200f, Gfx.lineColor(line), 300f, 0.6f, 30f)
                val name = data.line(line).name
                banner("$name 라인만 통해요!", Gfx.lineColor(line), "$name 아이템을 보급하면 해제")
            }
            "freeze" -> {
                val cells = board.cells.indices.filter { board[it].frozen <= 0f }.shuffled(random).take(if (ok) 2 else 6)
                cells.forEach {
                    board[it].frozen = 7f
                    fx.burst(Layout.cellCx(it), Layout.cellCy(it), ICE, 10, 400f, 10f, 0.4f)
                }
                if (drag?.from in cells) drag = null
                audio.play("freeze")
                fx.flash(ICE, 0.4f)
            }
            "armorbreak" -> {
                if (!ok) cats.filter { it.armor > 0 }.forEach {
                    it.armor--
                    recalcHp(it)
                    fx.number(it.x, it.y - 300f, "방어구 파괴!", 42f, ARMOR_TEXT)
                    fx.sparks(it.x, it.y - 100f, ICE, 16)
                }
                fx.shake(20f)
                audio.play("crit")
            }
            "suck" -> {
                val cells = board.cells.indices.filter { canUse(it) && drag?.from != it }.shuffled(random).take(if (ok) 1 else 3)
                cells.forEach { i ->
                    val it = board[i].item!!
                    board[i].item = null
                    val key = if (it.chest) "icons/chest" else "items/${it.line.name}-${it.tier}"
                    fx.p {
                        x = Layout.cellCx(i); y = Layout.cellCy(i); img = key; size = 90f; life = 5f; additive = false; shrink = false; fade = false
                        target = true; tx = b.x; ty = b.y - 150f; delay = 0f; flyTime = 0.6f; curve = rnd(-100f, 100f)
                    }
                }
                fx.number(540f, 1250f, "아이템 ${cells.size}개 흡입!", 54f, SALMON)
                audio.play("supply")
            }
            "shieldup" -> {
                b.shieldHp = b.maxHp * if (ok) 0.06 else 0.14
                b.shieldMax = b.shieldHp
                fx.ring(b.x, b.y - 200f, SHIELD, 320f, 0.6f, 30f)
                audio.play("freeze")
            }
            "shock" -> {
                if (!ok) cats.forEach { it.shockT = 6f; fx.bolt(b.x, b.y - 200f, it.x, it.y - 120f, CHAIN_YELLOW) }
                audio.play("zap")
                fx.flash(CHAIN_YELLOW, 0.4f)
            }
            "rage" -> {
                b.rageT = if (ok) 3f else 7f
                fx.flash(RAGE, 0.4f)
                fx.shake(25f)
                audio.play("roar")
            }
        }
    }

    // ================= 튜토리얼 =================
    private fun advanceTutorial() {
        tutorial++
        if (tutorial == 3) {
            tutorial = -1
            banner("몬스터가 몰려와요!", Color.WHITE, "합성하고 보급해서 막아내요")
            phase = Phase.BREAK
            phaseT = 0f
            breakDur = 2f
        }
    }

    // ================= 입력 (좌상단 좌표) =================
    fun onDown(x: Float, y: Float) {
        if (paused || result != null || legend != null) return
        val i = Layout.cellAt(x, y)
        if (i >= 0 && canUse(i) && tutorial != 2) {
            drag = Drag(i, board[i].item!!, x, y, x, y)
            audio.play("pick")
        }
    }

    fun onMove(x: Float, y: Float) {
        val d = drag ?: return
        d.x = x
        d.y = y
        if (hypot(x - d.downX, y - d.downY) > 20f) d.moved = true
    }

    fun onUp(x: Float, y: Float) {
        val d = drag ?: return
        drag = null
        val from = d.from
        if (board[from].item !== d.item) return
        val it = d.item
        if (!d.moved) {
            if (it.chest) game.toast.show("옆에서 합성하면 상자가 열려요!")
            else game.toast.show("${data.itemName(it.line, it.tier)} Lv.${it.tier} · ${data.line(it.line).name}")
            return
        }
        // 보급: 레일 또는 전장
        if (y < Layout.RAIL_Y + Layout.RAIL_H + 10f && y > 150f && !it.chest) {
            if (tutorial == 0) return
            val cat = if (y < Layout.RAIL_Y) catAt(x, y) else null
            board[from].item = null
            supply(it, x, y, if (it.line != Line.special) cat else null)
            return
        }
        if (tutorial == 1) return
        val to = Layout.cellAt(x, y)
        if (to < 0 || to == from) { audio.play("drop"); return }
        when (val r = board.drop(from, to)) {
            DropResult.Cancelled -> Unit
            DropResult.Frozen -> game.toast.show("얼어붙은 칸이에요!", ICE)
            is DropResult.Locked -> {
                val need = data.balance.mergeUnlockLevels.getOrNull(r.tier - data.balance.freeMergeTier - 1)
                game.toast.show(if (need != null) "공방 Lv.$need 부터 ${r.tier}단계 합성 가능" else "최고 단계예요!", Gfx.GOLD)
                audio.play("full")
            }
            is DropResult.Moved -> { board[to].item?.pop = 0.2f; audio.play("drop") }
            is DropResult.Swapped -> {
                board[to].item?.pop = 0.2f
                board[from].item?.pop = 0.2f
                audio.play("drop")
            }
            is DropResult.Merged -> {
                if (r.bonusCell != null) {
                    val baseTier = r.tier - 1
                    r.consumed.forEach { c -> flyGhost(BoardItem(0, false, it.line, baseTier), c, to, 0.16f) }
                    fx.number(Layout.cellCx(to), Layout.cellCy(to) - 70f, "5개 합성! 보너스!", 56f, Gfx.GOLD, 1.3f)
                    fx.flash(BONUS_FLASH, 0.3f)
                }
                onMerged(r.cell, false, 0, r.chestsOpened)
                val bonus = r.bonusCell
                if (bonus != null) {
                    val bi = board[bonus].item!!
                    bi.pop = 0.4f
                    progress.recordTier(bi.line, bi.tier)
                    fx.burst(Layout.cellCx(bonus), Layout.cellCy(bonus), Gfx.lineColor(bi.line), 20, 700f, 12f, 0.5f)
                    addFever(2f)
                    if (bi.tier < board.mergeCap) chainQueue += ChainJob(bonus, 0.3f, 1, bi.uid)
                }
            }
        }
    }

    fun skipBreak() { if (phase == Phase.BREAK) phaseT = breakDur }

    // ================= 프레임 =================
    fun update(rawDt: Float) {
        if (paused || result?.shown == true) { fx.update(rawDt); return }
        legend?.let {
            it.t += rawDt
            fx.update(rawDt)
            if (it.t > 2.4f) legend = null
            return
        }
        if (fx.hitstop > 0f) {
            fx.hitstop -= rawDt
            fx.update(rawDt * 0.2f)
            return
        }
        val dt = rawDt * fx.timeScale()
        if (phase != Phase.INTRO && phase != Phase.TUTORIAL) time += dt
        banner?.let { it.t -= rawDt; if (it.t <= 0f) banner = null }
        bossCut?.let { it.t += rawDt; if (it.t > 2.4f) bossCut = null }
        if (comboT > 0f) comboT -= rawDt
        if (smithT > 0f) smithT -= rawDt
        if (boardShake > 0f) boardShake -= rawDt
        if (delayed.isNotEmpty()) {
            val due = ArrayList<() -> Unit>()
            val it = delayed.listIterator()
            while (it.hasNext()) {
                val (t, fn) = it.next()
                val nt = t - rawDt
                if (nt <= 0f) { due += fn; it.remove() } else it.set(nt to fn)
            }
            due.forEach { f -> f() }
        }

        board.tick(dt)
        for (c in board.cells) {
            val item = c.item ?: continue
            if (item.pop > 0f) item.pop -= rawDt
            if (item.flyT > 0f) {
                item.flyT -= rawDt
                if (item.flyT <= 0f) { item.pop = 0.3f; audio.play("pop") }
            }
        }
        processChains(rawDt)

        if (energy < energyMax) {
            regenT += dt
            if (regenT >= regenEvery) { regenT = 0f; energy++ }
        } else regenT = 0f
        if (autoEvery > 0f && tutorial < 0 && result == null) {
            autoT += dt
            if (autoT >= autoEvery) { autoT = 0f; produce(free = true) }
        }

        if (feverT > 0f) {
            feverT -= dt
            if (random.nextFloat() < 0.5f) fx.p { x = rnd(0f, 1080f); y = Layout.GROUND + 20f; vy = rnd(-500f, -250f); size = rnd(5f, 10f); color.set(listOf(SPARK, WEAPON_TEXT, CHAIN_YELLOW).random()); life = 0.8f; drag = 0.98f }
            if (feverT <= 0f) audio.music(if (boss?.dead == false) "boss" else "battle")
        }

        emergency?.let {
            it.t -= dt
            if (it.t <= 0f) {
                emergency = null
                execPattern(it)
            }
        }

        updateFlow(dt)
        updateRail(dt)
        beginFoeFrame()
        world.update(dt)
        fx.update(dt)
        checkEnd(rawDt)
    }

    private fun updateFlow(dt: Float) {
        phaseT += dt
        when (phase) {
            Phase.INTRO -> if (phaseT > 1.4f) {
                if (tutorial == 0) phase = Phase.TUTORIAL else startWave(0)
            }
            Phase.BREAK -> if (phaseT >= breakDur) startWave(waveIdx + 1)
            Phase.TUTORIAL -> Unit
            Phase.WAVE -> {
                if (spawnQ.isNotEmpty()) {
                    spawnT -= dt
                    if (spawnT <= 0f) {
                        spawnEnemy(spawnQ.removeFirst())
                        spawnT = rnd(0.9f, 1.5f)
                    }
                }
                val alive = foes.any { !it.dead }
                if (!alive && spawnQ.isEmpty() && waveIdx >= 0) {
                    if (waveIdx >= waves.size - 1) {
                        if (mode == Mode.TOWER) nextFloor()
                        else if (result == null) result = BattleResult(win = true, lost = false)
                    } else {
                        phase = Phase.BREAK
                        phaseT = 0f
                        breakDur = data.balance.breakSeconds
                        audio.play("wave")
                    }
                }
            }
        }
    }

    /** 탑 한 층 돌파: 보상을 바로 주고, 보드·장비·체력·에너지는 그대로 둔 채 다음 층을 시작한다 */
    private fun nextFloor() {
        val cleared = floor
        val reward = 50L + cleared * 20L
        towerGold += reward
        save.gold += reward
        if (cleared > save.towerBest) save.towerBest = cleared
        game.persist()
        floor = cleared + 1
        g = difficulty()
        hpScale = rules.stageHp(g)
        atkScale = rules.stageAtk(g)
        itemPower = rules.itemPower(g)
        // 새 층 공격력이 올라갔으니 착용 장비 수치도 다시 계산
        cats.filter { !it.isDown }.forEach { recalcHp(it) }
        waves = Waves.build(data, spec.copy(floor = floor), random, game.now)
        waveIdx = -1
        boss = null
        hpBarFoe = null
        phase = Phase.BREAK
        phaseT = 0f
        breakDur = data.balance.breakSeconds
        banner("${cleared}층 돌파!", Gfx.GOLD, "골드 +$reward · ${floor}층으로 올라가요")
        audio.play("win")
        fx.flash(LEGEND_FLASH, 0.35f)
    }

    private fun checkEnd(rawDt: Float) {
        if (result == null) {
            if (cats.isNotEmpty() && cats.all { it.isDown } && phase != Phase.INTRO) {
                result = BattleResult(win = mode == Mode.WORLD_BOSS, lost = true)
                fx.slow(1f, 0.3f)
                audio.play("lose")
            }
            val b = boss
            if (mode == Mode.WORLD_BOSS && b != null && b.state != FoeState.ENTER && time >= timeLimit) {
                result = BattleResult(win = true, lost = false)
            }
        }
        val r = result ?: return
        if (!r.shown) {
            r.t += rawDt
            if (r.t > (if (r.win && !r.lost) 2.2f else 1.6f)) finish(r)
        }
    }

    private fun finish(r: BattleResult) {
        r.shown = true
        r.t = 0f
        audio.music(null)
        var gold = killGold
        var gems = 0
        when (mode) {
            Mode.STAGE -> {
                r.win = !r.lost
                if (r.win) {
                    val hpRatio = cats.sumOf { it.hp.toDouble() }.toFloat() / cats.sumOf { it.maxHp.toDouble() }.toFloat()
                    r.checks = rules.starChecks(hpRatio, time, feverCount)
                    r.stars = r.checks.count { it }
                    val key = "${spec.chapter}-${spec.stage}"
                    val prev = save.stars[key] ?: 0
                    if (prev == 0) gems += 5
                    if (r.stars == 3 && prev < 3) gems += 10
                    save.stars[key] = max(prev, r.stars)
                    gold += 60 + (g * 30).roundToInt()
                    save.tutorialDone = true
                } else gold /= 2
            }
            Mode.TOWER -> {
                r.floor = floor - 1
                r.win = r.floor > 0
            }
            Mode.WORLD_BOSS -> {
                r.damage = totalDamage.roundToLong()
                gold += r.damage / 50
                gems += 3
                save.bossBest = max(save.bossBest, r.damage)
                save.bossTotal += r.damage
                r.win = true
            }
        }
        r.gold = gold + towerGold
        r.gems = gems
        save.gold += gold
        save.gems += gems
        save.plays++
        game.persist()
        if (r.win) {
            audio.play("win")
            fx.flash(LEGEND_FLASH, 0.5f)
        }
    }

    fun teamHp(): Pair<Float, Float> = cats.sumOf { it.hp.toDouble() }.toFloat() to cats.sumOf { it.maxHp.toDouble() }.toFloat()
    fun remainingFoes() = foes.count { !it.dead } + spawnQ.size

    companion object {
        val ORANGE_BANNER: Color = Color.valueOf("ffb347ff")
        val BOSS_FLASH: Color = Color.valueOf("3a0a14ff")
        val SALMON: Color = Color.valueOf("ffb3a8ff")
        val SPARK: Color = Color.valueOf("ffcf5aff")
        val CHAIN_YELLOW: Color = Color.valueOf("fff27aff")
        val COMBO_CREAM: Color = Color.valueOf("ffe8a8ff")
        val LEGEND_FLASH: Color = Color.valueOf("fff6c8ff")
        val FEVER_FLASH: Color = Color.valueOf("ffb03aff")
        val FEVER_YELLOW: Color = Color.valueOf("ffd23aff")
        val FEVER_RING: Color = Color.valueOf("ffae3aff")
        val ICE_FLASH: Color = Color.valueOf("e9f6ffff")
        val PINK_FLASH: Color = Color.valueOf("ffe0f4ff")
        val ICE_BOLT: Color = Color.valueOf("aee8ffff")
        val FIRE_BOLT: Color = Color.valueOf("ff9a4aff")
        val VIOLET_BOLT: Color = Color.valueOf("d6b8ffff")
        val WEAPON_TEXT: Color = Color.valueOf("ffb36bff")
        val ARMOR_TEXT: Color = Color.valueOf("8fc4ffff")
        val HEAL_DOT: Color = Color.valueOf("9dffb5ff")
        val SHIELD: Color = Color.valueOf("8fe3ffff")
        val FEVER_NUMBER: Color = Color.valueOf("ffdf4aff")
        val CRIT_NUMBER: Color = Color.valueOf("ffe14aff")
        val MAGIC_NUMBER: Color = Color.valueOf("e7c4ffff")
        val CRIT_LABEL: Color = Color.valueOf("ff6a3aff")
        val DEATH_WHITE: Color = Color.valueOf("fff4d8ff")
        val HURT: Color = Color.valueOf("ff6a6aff")
        val POISON: Color = Color.valueOf("b36bffff")
        val POISON_CLOUD = Color(0.63f, 0.35f, 0.86f, 0.35f)
        val SLASH_SPARK: Color = Color.valueOf("ffe0a8ff")
        val ARROW: Color = Color.valueOf("fff2c0ff")
        val FIRE: Color = Color.valueOf("ff8a3aff")
        val FIRE_DEEP: Color = Color.valueOf("ff5a2aff")
        val EMBER: Color = Color.valueOf("ffb35aff")
        val ASH = Color(0.35f, 0.24f, 0.2f, 0.5f)
        val SPORE: Color = Color.valueOf("b8c4ffff")
        val SPORE_POISON: Color = Color.valueOf("c98bffff")
        val RAGE: Color = Color.valueOf("ff3a2aff")
        val WARN_RED: Color = Color.valueOf("ff6a5aff")
        val ICE: Color = Color.valueOf("bfefffff")
        val BONUS_FLASH: Color = Color.valueOf("fff3c0ff")
    }
}
