package com.mergenyang.game

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Input
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.utils.viewport.FitViewport
import com.badlogic.gdx.utils.viewport.Viewport
import com.mergenyang.core.BattleSpec
import com.mergenyang.core.GameData
import com.mergenyang.core.Mode
import com.mergenyang.core.Progress
import com.mergenyang.core.Rules
import com.mergenyang.core.SaveData
import com.mergenyang.game.battle.BattleScreen
import com.mergenyang.game.screens.CatsScreen
import com.mergenyang.game.screens.GrowthScreen
import com.mergenyang.game.screens.LobbyScreen
import com.mergenyang.game.screens.ModesScreen
import com.mergenyang.game.screens.RankingScreen
import com.mergenyang.game.screens.ShopScreen
import com.mergenyang.game.screens.StagesScreen
import com.mergenyang.game.screens.TitleScreen
import com.mergenyang.game.ui.UiSound
import ktx.app.KtxGame
import ktx.app.KtxScreen
import java.time.LocalDate

object Screens {
    lateinit var viewport: Viewport
}

class MergeNyangGame(val platform: Platform) : KtxGame<KtxScreen>(clearScreen = false) {
    lateinit var batch: SpriteBatch
        private set
    val assets = Assets()
    lateinit var audio: Audio
        private set
    val fx = Fx()
    val toast = Toast()

    lateinit var data: GameData
        private set
    lateinit var rules: Rules
        private set
    lateinit var save: SaveData
        private set
    lateinit var progress: Progress
        private set

    var loaded = false
        private set
    private var fade = 0f
    private var fadeDir = 0
    private var pending: (() -> Unit)? = null
    val transitioning get() = fadeDir != 0

    val now: Long get() = System.currentTimeMillis()
    val today: String get() = LocalDate.now().toString()

    override fun create() {
        Screens.viewport = FitViewport(Gfx.W, Gfx.H)
        batch = SpriteBatch(2000)
        Gfx.batch = batch
        Gfx.assets = assets
        assets.init()
        assets.queue()
        data = assets.data
        Chars.data = data
        rules = Rules(data)
        save = SaveData.fromJson(platform.saveStore.load())
        progress = Progress(data, save)
        Gdx.input.setCatchKey(Input.Keys.BACK, true)
        platform.debugHook?.onCreate(this)
    }

    private fun onLoaded() {
        audio = Audio(assets).apply {
            sfxOn = save.sfx
            bgmOn = save.bgm
        }
        UiSound.play = { audio.play(it) }
        addScreen(TitleScreen(this))
        addScreen(LobbyScreen(this))
        addScreen(CatsScreen(this))
        addScreen(GrowthScreen(this))
        addScreen(ModesScreen(this))
        addScreen(StagesScreen(this))
        addScreen(ShopScreen(this))
        addScreen(RankingScreen(this))
        addScreen(BattleScreen(this))
        loaded = true
        setScreen<TitleScreen>()
    }

    override fun render() {
        Gdx.gl.glClearColor(0.16f, 0.09f, 0.05f, 1f)
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT)
        val delta = Gdx.graphics.deltaTime.coerceAtMost(0.05f)
        if (!loaded) {
            if (assets.manager.update(16)) onLoaded() else drawLoading(assets.manager.progress)
            return
        }
        if (fadeDir == 1) {
            fade += delta * 6f
            if (fade >= 1f) {
                fade = 1f
                fadeDir = -1
                pending?.invoke()
                pending = null
            }
        } else if (fadeDir == -1) {
            fade -= delta * 4f
            if (fade <= 0f) { fade = 0f; fadeDir = 0 }
        }
        currentScreen.render(delta)
        toast.update(delta)
        beginHud()
        toast.draw()
        if (fade > 0f) Gfx.rect(0f, 0f, Gfx.W, Gfx.H, FADE, fade)
        batch.end()
        platform.debugHook?.afterRender(this, delta)
    }

    fun beginHud() {
        Screens.viewport.apply()
        Screens.viewport.camera.position.set(Gfx.W / 2, Gfx.H / 2, 0f)
        Screens.viewport.camera.update()
        batch.projectionMatrix = Screens.viewport.camera.combined
        batch.begin()
    }

    private fun drawLoading(p: Float) {
        beginHud()
        Gfx.rect(0f, 0f, Gfx.W, Gfx.H, LOADING_BG)
        Gfx.text("머지냥 디펜스", Gfx.W / 2, 820f, 96f, Gfx.color("7a3a16ff"))
        Gfx.rect(190f, 960f, 700f, 40f, LOADING_TRACK)
        Gfx.rect(190f, 960f, 700f * p, 40f, LOADING_FILL)
        Gfx.text("고양이들이 망치를 챙기는 중... ${(p * 100).toInt()}%", Gfx.W / 2, 1060f, 34f, Gfx.SUB)
        batch.end()
    }

    /** 페이드 전환 */
    fun go(type: Class<out KtxScreen>) {
        if (fadeDir != 0) return
        pending = {
            fx.clear()
            @Suppress("UNCHECKED_CAST")
            setScreen(type as Class<KtxScreen>)
        }
        fadeDir = 1
    }

    inline fun <reified T : KtxScreen> go() = go(T::class.java)

    /** 전투 시작: 에너지·입장 횟수 확인 후 전환 */
    fun startBattle(spec: BattleSpec, free: Boolean = false): Boolean {
        progress.tickEnergy(now)
        when {
            spec.mode == Mode.WORLD_BOSS -> {
                progress.refreshBossTries(today)
                if (save.bossTries <= 0) {
                    toast.show("오늘의 도전 횟수를 모두 썼어요", Gfx.GOLD)
                    return false
                }
                save.bossTries--
            }
            !free -> {
                val cost = data.balance.stageEnergyCost
                if (save.energy < cost) {
                    toast.show("에너지가 부족해요!", Gfx.GOLD)
                    (currentScreen as? com.mergenyang.game.screens.MenuScreen)?.showPopup("energy")
                    return false
                }
                save.energy -= cost
            }
        }
        persist()
        audio.play("supply")
        getScreen<BattleScreen>().prepare(spec)
        go<BattleScreen>()
        return true
    }

    fun currentScreenName(): String = currentScreen::class.java.simpleName

    fun persist() {
        save.lastSeen = save.lastSeen.coerceAtLeast(1)
        platform.saveStore.save(save.toJson())
    }

    fun resetSave() {
        save = SaveData()
        progress = Progress(data, save)
        persist()
    }

    override fun resize(width: Int, height: Int) {
        Screens.viewport.update(width, height, true)
        super.resize(width, height)
    }

    override fun pause() {
        if (loaded) {
            persist()
            audio.pause()
        }
        super.pause()
    }

    override fun resume() {
        if (loaded) audio.resume()
        super.resume()
    }

    override fun dispose() {
        if (loaded) persist()
        super.dispose()
        batch.dispose()
        assets.dispose()
    }

    companion object {
        private val FADE = Color.valueOf("2a160cff")
        private val LOADING_BG = Color.valueOf("f6e7cfff")
        private val LOADING_TRACK = Color.valueOf("e0c8a8ff")
        private val LOADING_FILL = Color.valueOf("f0a040ff")
    }
}

/** 화면 중앙 알림 */
class Toast {
    private class Item(val msg: String, val color: Color) { var t = 0f }
    private val items = ArrayList<Item>()

    fun show(msg: String, color: Color = Color.WHITE) {
        items += Item(msg, color)
        if (items.size > 3) items.removeAt(0)
    }

    fun update(dt: Float) {
        items.forEach { it.t += dt }
        items.removeAll { it.t >= 2f }
    }

    fun draw() {
        items.forEachIndexed { i, it ->
            val a = when {
                it.t < 0.2f -> it.t / 0.2f
                it.t > 1.6f -> (2f - it.t) / 0.4f
                else -> 1f
            }
            val y = 520f + i * 90f - easeOut(minOf(1f, it.t * 4f)) * 30f
            val w = it.msg.length * 36f + 80f
            Gfx.nine("ui/panel-dark", Gfx.W / 2 - w / 2, y - 40f, w, 80f, 90, 0.35f, a * 0.95f)
            Gfx.text(it.msg, Gfx.W / 2, y, 36f, it.color, alpha = a, maxW = w - 40f)
        }
    }
}
