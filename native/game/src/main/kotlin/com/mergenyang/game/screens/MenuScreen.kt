package com.mergenyang.game.screens

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Input
import com.badlogic.gdx.InputAdapter
import com.badlogic.gdx.InputMultiplexer
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.scenes.scene2d.Group
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.utils.Align
import com.mergenyang.core.Line
import com.mergenyang.game.Gfx
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.Screens
import com.mergenyang.game.ui.DimActor
import com.mergenyang.game.ui.DrawActor
import com.mergenyang.game.ui.HitActor
import com.mergenyang.game.ui.ImgActor
import com.mergenyang.game.ui.NyButton
import com.mergenyang.game.ui.PanelActor
import com.mergenyang.game.ui.TextActor
import com.mergenyang.game.ui.at
import ktx.app.KtxScreen
import kotlin.math.sin

fun fmt(n: Long): String = "%,d".format(n)
fun fmt(n: Int): String = "%,d".format(n)
fun shortNum(n: Double): String = when {
    n >= 1e6 -> "%.1fM".format(n / 1e6)
    n >= 1e4 -> "%.1fK".format(n / 1e3)
    else -> "%,d".format(n.toLong())
}

/** Scene2D 기반 메뉴 화면 공통: 배경, 상단 재화 바, 헤더, 하단 탭, 팝업 */
abstract class MenuScreen(val game: MergeNyangGame, private val background: String) : KtxScreen {
    protected val stage = Stage(Screens.viewport, game.batch)
    protected val root = Group()
    private val popupLayer = Group()
    var time = 0f
        protected set
    protected val data get() = game.data
    protected val save get() = game.save
    protected val progress get() = game.progress
    protected val fx get() = game.fx

    private val backKey = object : InputAdapter() {
        override fun keyDown(keycode: Int): Boolean {
            if (keycode != Input.Keys.BACK && keycode != Input.Keys.ESCAPE) return false
            if (popupLayer.hasChildren()) closePopup() else onBack()
            return true
        }
    }

    init {
        stage.addActor(root)
        stage.addActor(popupLayer)
    }

    protected abstract fun build(g: Group)
    protected open fun onBack() = game.go<LobbyScreen>()
    protected open fun music() = "lobby"
    protected open fun update(delta: Float) = Unit

    override fun show() {
        Gdx.input.inputProcessor = InputMultiplexer(stage, backKey)
        time = 0f
        popupLayer.clearChildren()
        game.audio.music(music())
        rebuild()
    }

    fun rebuild() {
        root.clearChildren()
        build(root)
    }

    override fun render(delta: Float) {
        time += delta
        update(delta)
        fx.update(delta)
        stage.act(delta)
        game.beginHud()
        Gfx.img("bg/$background", 0f, 0f, Gfx.W, Gfx.H)
        game.batch.end()
        stage.draw()
        game.beginHud()
        fx.drawWorld()
        fx.drawParts(true)
        fx.drawTexts()
        fx.drawOverlay()
        game.batch.end()
    }

    override fun dispose() = stage.dispose()

    // ---------- 공통 영역 ----------
    protected fun topBar(g: Group) {
        progress.tickEnergy(game.now)
        val slots = listOf(
            Triple("icons/energy", { "${save.energy}/${data.balance.lobbyEnergyMax}" }, { showPopup("energy") }),
            Triple("icons/gold", { shortNum(save.gold.toDouble()) }, null),
            Triple("icons/gem", { fmt(save.gems) }, { game.go<ShopScreen>() }),
        )
        slots.forEachIndexed { i, (icon, value, tap) ->
            val x = 20f + i * 340f
            g.at(PanelActor("ui/panel-dark"), x, 18f, 320f, 76f)
            g.at(ImgActor(icon), x + 13f, 27f, 58f, 58f)
            g.at(TextActor(value, 36f, Color.WHITE), x + 70f, 18f, 200f, 76f)
            if (tap != null) g.at(HitActor { game.audio.play("click"); tap() }, x, 18f, 320f, 76f)
        }
        g.at(TextActor({
            if (save.energy >= data.balance.lobbyEnergyMax) "" else {
                val eta = (progress.energyEtaMs(game.now) / 1000).toInt()
                "+1 %d:%02d".format(eta / 60, eta % 60)
            }
        }, 22f, Color.WHITE, outline = true), 100f, 96f, 160f, 24f)
    }

    protected fun header(g: Group, title: String, sub: String?, back: () -> Unit = { game.go<LobbyScreen>() }) {
        g.at(NyButton("", "cream", icon = "icons/back", iconSize = 60f, onClick = back), 24f, 118f, 110f, 100f)
        g.at(PanelActor("ui/title-banner", 100, 0.5f), 150f, 108f, 780f, 124f)
        g.at(TextActor(title, 50f), 170f, 108f, 740f, 124f)
        g.at(NyButton("", "cream", icon = "icons/gear", iconSize = 60f) { showPopup("settings") }, 946f, 118f, 110f, 100f)
        if (sub != null) {
            g.at(PanelActor("ui/panel-cream"), 170f, 236f, 740f, 62f)
            g.at(TextActor(sub, 30f, Gfx.SUB), 200f, 236f, 680f, 62f)
        }
    }

    protected fun tabBar(g: Group, active: String) {
        g.at(PanelActor("ui/panel-cream"), 10f, 1745f, 1060f, 170f)
        val tabs = listOf(
            Triple("lobby", "대장간", "icons/forge"),
            Triple("cats", "고양이", "icons/cat"),
            Triple("modes", "전투", "icons/sword"),
            Triple("shop", "상점", "icons/shop"),
            Triple("ranking", "랭킹", "icons/trophy"),
        )
        val w = 1000f / tabs.size
        tabs.forEachIndexed { i, (id, label, icon) ->
            val x = 40f + i * w
            val on = id == active
            if (on) g.at(PanelActor("ui/button-mint-selected", 60, 0.6f), x + 6f, 1765f, w - 12f, 132f)
            g.at(DrawActor { a ->
                val b = if (on) sin(time * 5f) * 4f else 0f
                val s = if (on) 84f else 72f
                Gfx.fit(icon, x + w / 2, 1812f + b, s, s, a)
            }, x, 1760f, w, 150f)
            g.at(TextActor(label, 28f, if (on) Gfx.color("2a5a3aff") else Gfx.SUB), x, 1850f, w, 44f)
            if (!on) g.at(HitActor {
                game.audio.play("click")
                when (id) {
                    "lobby" -> game.go<LobbyScreen>()
                    "cats" -> game.go<CatsScreen>()
                    "modes" -> game.go<ModesScreen>()
                    "shop" -> game.go<ShopScreen>()
                    else -> game.go<RankingScreen>()
                }
            }, x, 1760f, w, 150f)
        }
    }

    // ---------- 팝업 ----------
    fun closePopup() {
        popupLayer.clearChildren()
        rebuild()
    }

    fun showPopup(kind: String, arg: Any? = null) {
        popupLayer.clearChildren()
        val p = Group()
        popupLayer.addActor(p)
        val close = { closePopup() }
        p.at(DimActor(0.6f, if (kind == "codex") close else null), 0f, 0f, Gfx.W, Gfx.H)
        when (kind) {
            "settings" -> {
                p.at(PanelActor("ui/panel-cream"), 140f, 500f, 800f, 900f)
                p.at(TextActor("설정", 60f), 140f, 550f, 800f, 80f)
                p.at(NyButton("배경음악 ${if (game.audio.bgmOn) "ON" else "OFF"}", if (game.audio.bgmOn) "mint" else "cream") {
                    game.audio.bgmOn = !game.audio.bgmOn
                    save.bgm = game.audio.bgmOn
                    game.persist()
                    showPopup("settings")
                }, 220f, 680f, 640f, 120f)
                p.at(NyButton("효과음 ${if (game.audio.sfxOn) "ON" else "OFF"}", if (game.audio.sfxOn) "mint" else "cream") {
                    game.audio.sfxOn = !game.audio.sfxOn
                    save.sfx = game.audio.sfxOn
                    game.persist()
                    showPopup("settings")
                }, 220f, 820f, 640f, 120f)
                p.at(NyButton("타이틀로", "cream") { closePopup(); game.go<TitleScreen>() }, 220f, 960f, 640f, 120f)
                p.at(NyButton("데이터 초기화", "peach") { showPopup("reset") }, 220f, 1100f, 640f, 110f)
                p.at(NyButton("닫기", "yellow", onClick = close), 340f, 1250f, 400f, 110f)
            }
            "reset" -> {
                p.at(PanelActor("ui/panel-lavender"), 140f, 650f, 800f, 600f)
                p.at(TextActor("정말 초기화할까요?", 54f, Color.WHITE, outline = true), 140f, 730f, 800f, 80f)
                p.at(TextActor("모든 진행 상황이 사라져요", 32f, Color.WHITE), 140f, 820f, 800f, 60f)
                p.at(NyButton("초기화", "peach") { game.resetSave(); closePopup(); game.go<TitleScreen>() }, 200f, 950f, 330f, 120f)
                p.at(NyButton("취소", "mint", onClick = close), 550f, 950f, 330f, 120f)
            }
            "energy" -> {
                p.at(PanelActor("ui/panel-cream"), 140f, 600f, 800f, 720f)
                p.at(TextActor("에너지 충전", 58f), 140f, 660f, 800f, 80f)
                p.at(ImgActor("icons/energy"), 450f, 770f, 180f, 180f)
                p.at(TextActor("현재 ${save.energy} / ${data.balance.lobbyEnergyMax} · 2분마다 1 회복", 32f, Gfx.SUB), 140f, 970f, 800f, 60f)
                p.at(NyButton("에너지 50 충전", "yellow", sub = "보석 30", icon = "icons/gem", onDisabled = { game.toast.show("보석이 부족해요", Gfx.GOLD) }) {
                    save.gems -= 30
                    save.energy = minOf(99, save.energy + 50)
                    game.persist()
                    game.audio.play("chest")
                    game.toast.show("에너지 충전 완료!", Gfx.MINT)
                    closePopup()
                }.apply { disabled = save.gems < 30 }, 220f, 1060f, 640f, 130f)
                p.at(NyButton("닫기", "cream", onClick = close), 340f, 1210f, 400f, 90f)
            }
            "upgraded" -> {
                val (name, desc) = arg as Pair<*, *>
                p.at(PanelActor("ui/panel-cream"), 140f, 620f, 800f, 640f)
                p.at(ImgActor("icons/star").apply { bob = 8f }, 450f, 670f, 180f, 180f)
                p.at(TextActor("공방이 성장했어요!", 56f), 140f, 870f, 800f, 80f)
                p.at(TextActor(name.toString(), 36f, Gfx.color("2a9a5aff")), 140f, 960f, 800f, 60f)
                p.at(TextActor(desc.toString(), 30f, Gfx.SUB), 140f, 1020f, 800f, 60f)
                p.at(NyButton("좋아요", "yellow", onClick = close), 290f, 1110f, 500f, 120f)
            }
            "codex" -> {
                p.at(PanelActor("ui/panel-cream"), 40f, 300f, 1000f, 1350f)
                p.at(TextActor("수집 도감", 56f), 40f, 350f, 1000f, 80f)
                Line.entries.forEachIndexed { li, line ->
                    p.at(TextActor(data.line(line).name, 32f, Gfx.lineColor(line), Align.left, outline = true), 80f, 460f + li * 270f, 300f, 44f)
                    val got = save.maxTier[line.name] ?: 0
                    for (t in 1..8) {
                        val x = 80f + (t - 1) * 116f
                        val y = 510f + li * 270f
                        p.at(ImgActor("ui/board-cell"), x, y + 6f, 108f, 108f)
                        p.at(ImgActor("items/${line.name}-$t", tint = if (t <= got) Color.WHITE else SILHOUETTE), x + 9f, y + 20f, 90f, 80f)
                        p.at(TextActor("$t", 22f, Gfx.MUTED), x + 70f, y + 88f, 30f, 28f)
                    }
                }
                val cnt = Line.entries.sumOf { save.maxTier[it.name] ?: 0 }
                p.at(TextActor("수집률 $cnt / 32 · 화면을 누르면 닫혀요", 34f), 40f, 1550f, 1000f, 60f)
            }
            "help" -> {
                p.at(PanelActor("ui/panel-cream"), 60f, 330f, 960f, 1300f)
                p.at(TextActor("머지냥 디펜스 플레이 방법", 48f), 60f, 380f, 960f, 80f)
                val rows = listOf(
                    Triple("icons/paw", "생산", "에너지 1로 대장장이 냥이가 아이템을 만들어요"),
                    Triple("icons/star", "합성", "같은 라인·같은 단계 2개를 겹치면 다음 단계!"),
                    Triple("icons/check", "연쇄 · 5개 합성", "옆에 같은 아이템이 있으면 자동 연쇄, 5개면 상위 2개"),
                    Triple("icons/flag", "보급", "레일에 놓으면 자동 배달, 고양이 위에 놓으면 지정 배달"),
                    Triple("icons/sword", "장비", "무기=공격력, 방어구=방어·체력 (뚱냥이 1.5배)"),
                    Triple("icons/heart", "소모품", "회복·부활·버프, 성직냥이는 전체에 퍼뜨려요"),
                    Triple("icons/yarn", "특수", "장착하지 않고 즉시 화면 전체 광역 공격"),
                    Triple("icons/energy", "피버", "합성으로 게이지를 채우면 공격력 2배"),
                    Triple("icons/rat", "보스", "\"!\" 경고 중 보급하면 긴급 보급 성공 → 반격"),
                )
                rows.forEachIndexed { i, (icon, a, b) ->
                    val y = 480f + i * 118f
                    p.at(ImgActor(icon), 95f, y, 70f, 70f)
                    p.at(TextActor(a, 34f, align = Align.left), 190f, y - 8f, 780f, 44f)
                    p.at(TextActor(b, 26f, Gfx.SUB, Align.left), 190f, y + 34f, 780f, 40f)
                }
                p.at(NyButton("알겠어요", "yellow", onClick = close), 340f, 1500f, 400f, 100f)
            }
        }
    }

    companion object {
        val SILHOUETTE = Color(0.35f, 0.25f, 0.18f, 0.35f)
    }
}
