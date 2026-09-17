package com.mergenyang.game

import com.badlogic.gdx.audio.Music
import com.badlogic.gdx.utils.TimeUtils

/** 효과음(같은 소리 연속 재생 제한)과 배경음악 전환 */
class Audio(private val assets: Assets) {
    var sfxOn = true
    var bgmOn = true
        set(value) {
            field = value
            current?.let { if (value) it.play() else it.pause() }
        }

    private val last = HashMap<String, Long>()
    private var current: Music? = null
    var currentName: String? = null
        private set

    private val gaps = mapOf("hit" to 30L, "coin" to 35L, "crit" to 50L, "enemyhit" to 50L, "slash" to 30L)

    fun play(name: String, pitch: Float = 1f, volume: Float = 1f) {
        if (!sfxOn) return
        val now = TimeUtils.millis()
        val gap = gaps[name] ?: 0L
        if (gap > 0 && now - (last[name] ?: 0L) < gap) return
        last[name] = now
        assets.sound(name)?.play(volume * 0.85f, pitch.coerceIn(0.5f, 2f), 0f)
    }

    /** 합성 콤보가 오를수록 음이 높아진다 */
    fun comboPitch(combo: Int): Float = Math.pow(2.0, (combo.coerceAtMost(12)) / 12.0).toFloat()

    fun music(name: String?) {
        if (name == currentName) return
        current?.stop()
        currentName = name
        current = name?.let { assets.music(it) }?.apply {
            isLooping = true
            volume = if (name == "lobby") 0.55f else 0.45f
            if (bgmOn) play()
        }
    }

    fun pause() = current?.pause()
    fun resume() { if (bgmOn) current?.play() }
}
