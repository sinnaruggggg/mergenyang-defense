package com.mergenyang.game

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.assets.AssetManager
import com.badlogic.gdx.audio.Music
import com.badlogic.gdx.audio.Sound
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.graphics.g2d.BitmapFont
import com.badlogic.gdx.graphics.g2d.NinePatch
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.graphics.g2d.TextureRegion
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator
import com.badlogic.gdx.utils.Disposable
import com.mergenyang.core.GameData
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/** 텍스처 아틀라스·배경·사운드·폰트·데이터 테이블 */
class Assets : Disposable {
    val manager = AssetManager()
    lateinit var data: GameData
        private set

    private val atlasNames = listOf("ui", "icons", "items", "portraits", "chars")
    private val backgrounds = listOf("battle", "shop", "town", "workshop")
    val sfxNames = listOf(
        "click", "pick", "drop", "merge", "chain", "produce", "pop", "supply", "equip", "heal", "hit", "slash", "crit",
        "arrow", "fire", "boom", "bigboom", "zap", "enemyhit", "die", "coin", "meow", "roar", "warn", "fever", "wave",
        "star", "win", "lose", "legend", "freeze", "full", "chest",
    )
    val bgmNames = listOf("lobby", "battle", "boss", "fever")

    private val regions = HashMap<String, TextureRegion?>()
    private val patches = HashMap<String, NinePatch>()
    private val fonts = HashMap<Long, BitmapFont>()
    private var generator: FreeTypeFontGenerator? = null
    private val generated = ArrayList<Texture>()

    lateinit var white: TextureRegion
    lateinit var glow: TextureRegion
    lateinit var ring: TextureRegion
    lateinit var dot: TextureRegion

    fun queue() {
        atlasNames.forEach { manager.load("atlas/$it.atlas", TextureAtlas::class.java) }
        val bgParam = com.badlogic.gdx.assets.loaders.TextureLoader.TextureParameter().apply {
            minFilter = Texture.TextureFilter.Linear
            magFilter = Texture.TextureFilter.Linear
        }
        backgrounds.forEach { manager.load("backgrounds/$it.png", Texture::class.java, bgParam) }
        sfxNames.forEach { manager.load("sfx/$it.wav", Sound::class.java) }
        bgmNames.forEach { manager.load("bgm/$it.wav", Music::class.java) }
    }

    /** 앱 시작 직후: 데이터 테이블, 폰트, 효과용 기본 텍스처 (로딩 화면에서도 쓴다) */
    fun init() {
        data = GameData.parse(Gdx.files.internal("data/gamedata.json").readString("UTF-8"))
        generator = FreeTypeFontGenerator(Gdx.files.internal("fonts/NotoSansKR-ExtraBold.ttf"))
        white = TextureRegion(makeTexture(4) { _, _ -> 1f })
        glow = TextureRegion(makeTexture(128) { d, _ -> (1f - d).coerceIn(0f, 1f).let { it * it } })
        dot = TextureRegion(makeTexture(32) { d, _ -> ((1f - d) * 3f).coerceIn(0f, 1f) })
        ring = TextureRegion(makeTexture(256) { d, _ -> (1f - kotlin.math.abs(d - 0.9f) / 0.08f).coerceIn(0f, 1f) })
    }

    /** 반경(0=중심,1=가장자리)에 따른 알파로 흰색 텍스처 생성 */
    private fun makeTexture(size: Int, alpha: (Float, Float) -> Float): Texture {
        val pm = Pixmap(size, size, Pixmap.Format.RGBA8888)
        val c = (size - 1) / 2f
        for (y in 0 until size) for (x in 0 until size) {
            val d = sqrt(((x - c) * (x - c) + (y - c) * (y - c))) / c
            val a = if (size <= 4) 1f else alpha(d, 0f)
            pm.drawPixel(x, y, Color.rgba8888(1f, 1f, 1f, a))
        }
        val t = Texture(pm).apply { setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear) }
        pm.dispose()
        generated += t
        return t
    }

    /** "ui/panel-cream", "items/weapon-3", "chars/atk_cat-warrior_1", "bg/battle" */
    fun region(key: String): TextureRegion? = regions.getOrPut(key) {
        val slash = key.indexOf('/')
        val group = key.substring(0, slash)
        val name = key.substring(slash + 1)
        if (group == "bg") {
            TextureRegion(manager.get("backgrounds/$name.png", Texture::class.java))
        } else {
            manager.get("atlas/$group.atlas", TextureAtlas::class.java).findRegion(name)
        }
    }

    /** 9-slice. split은 원본 픽셀, scale은 가장자리 확대 비율 */
    fun patch(key: String, split: Int, scale: Float): NinePatch? {
        val id = "$key@$split@$scale"
        patches[id]?.let { return it }
        val r = region(key) ?: return null
        val s = min(split, min(r.regionWidth, r.regionHeight) / 2 - 1)
        val np = NinePatch(r, s, s, s, s)
        np.scale(scale, scale)
        patches[id] = np
        return np
    }

    fun sound(name: String): Sound? = manager.get("sfx/$name.wav", Sound::class.java)
    fun music(name: String): Music? = manager.get("bgm/$name.wav", Music::class.java)

    /** size: 픽셀 크기, outline: 짙은 갈색 외곽선 */
    fun font(size: Int, outline: Boolean): BitmapFont {
        val key = size.toLong() * 2 + if (outline) 1 else 0
        return fonts.getOrPut(key) {
            val p = FreeTypeFontGenerator.FreeTypeFontParameter().apply {
                this.size = size
                incremental = true
                color = Color.WHITE
                minFilter = Texture.TextureFilter.Linear
                magFilter = Texture.TextureFilter.Linear
                hinting = FreeTypeFontGenerator.Hinting.AutoMedium
                characters = FreeTypeFontGenerator.DEFAULT_CHARS
                if (outline) {
                    borderWidth = max(2f, size * 0.12f)
                    borderColor = Color(0.24f, 0.12f, 0.06f, 1f)
                    borderStraight = false
                }
            }
            generator!!.generateFont(p).apply { setUseIntegerPositions(false) }
        }
    }

    override fun dispose() {
        fonts.values.forEach { it.dispose() }
        generator?.dispose()
        generated.forEach { it.dispose() }
        manager.dispose()
    }
}
