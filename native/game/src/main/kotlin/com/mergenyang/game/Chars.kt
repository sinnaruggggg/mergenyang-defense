package com.mergenyang.game

import com.badlogic.gdx.graphics.Color
import com.mergenyang.core.GameData

/**
 * 캐릭터 프레임 그리기.
 * 대기(V3)와 공격(V4) 원화는 배율이 다르고, 공격 원화의 준비·타격 프레임끼리도 몸 크기가 달라
 * 프레임마다 atkFit 보정을 적용해 몸 크기를 맞춘다.
 */
object Chars {
    lateinit var data: GameData

    fun idleKey(anim: String, t: Float, phase: Float = 0f) = "chars/idle_${anim}_${((t * 2.5f + phase).toInt()) % 2}"

    fun idle(
        anim: String, x: Float, feetY: Float, s: Float, t: Float, phase: Float = 0f,
        flip: Boolean = false, sx: Float = 1f, sy: Float = 1f, alpha: Float = 1f, flash: Float = 0f, gray: Boolean = false,
    ) = Gfx.frame(idleKey(anim, t, phase), x, feetY, s, flip, sx, sy, alpha, flash, gray)

    /** 고양이 공격 프레임 (id: warrior … wizard, smith) */
    fun catAttack(
        id: String, frame: Int, x: Float, feetY: Float, s: Float,
        flip: Boolean = false, sx: Float = 1f, sy: Float = 1f, alpha: Float = 1f, flash: Float = 0f, gray: Boolean = false,
    ) {
        val fit = (if (id == "smith") data.smithAtkFit else data.cat(id).atkFit)[frame]
        val dx = fit[1] * s * (if (flip) -1f else 1f)
        Gfx.frame("chars/atk_cat-${id}_$frame", x + dx, feetY, s * fit[0], flip, sx, sy, alpha, flash, gray)
    }

    /** 몬스터·보스 프레임 (왼쪽을 바라봄) */
    fun foe(atkId: String, frame: Int, x: Float, feetY: Float, s: Float, sx: Float = 1f, sy: Float = 1f, alpha: Float = 1f, flash: Float = 0f, tint: Color = Color.WHITE) =
        Gfx.frame("chars/atk_${atkId}_$frame", x, feetY, s, false, sx, sy, alpha, flash, false, tint)

    fun shadow(x: Float, y: Float, w: Float, alpha: Float = 0.8f) =
        Gfx.img("ui/ground-shadow", x - w / 2, y - w * 0.09f, w, w * 0.18f, alpha)
}
