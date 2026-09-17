package com.mergenyang.game.battle

import com.mergenyang.core.Line
import com.mergenyang.core.MergeBoard
import kotlin.math.min

/**
 * 개발·검증용 자동 플레이어: 합성 → 보급 → 생산 순으로 사람 속도(초당 2회)로 조작한다.
 * 스크린샷 시나리오와 밸런스 시뮬레이션에서 쓴다.
 */
class AutoPlayer(private val b: Battle) {
    private var acc = 0f

    fun tick(dt: Float) {
        acc += dt
        if (acc < 0.5f) return
        acc = 0f
        step()
    }

    private fun drag(from: Int, toX: Float, toY: Float) {
        val x = Layout.cellCx(from)
        val y = Layout.cellCy(from)
        b.onDown(x, y)
        b.onMove((x + toX) / 2, (y + toY) / 2)
        b.onMove(toX, toY)
        b.onUp(toX, toY)
    }

    fun step() {
        if (b.result != null || b.paused || b.legend != null) return
        if (b.phase == Phase.BREAK && b.breakDur > 2f) b.skipBreak()
        val board = b.board
        val cells = board.cells.indices.filter { board.canUse(it) && board[it].item?.chest == false }
        for (a in cells) for (o in cells) {
            val ia = board[a].item!!
            val io = board[o].item!!
            if (a != o && ia.sameAs(io) && ia.tier < MergeBoard.MAX_TIER) {
                drag(a, Layout.cellCx(o), Layout.cellCy(o))
                return
            }
        }
        val need = b.emergency != null || board.emptyCells().size < 6 || b.cats.any { it.isDown || it.hp < it.maxHp * 0.4f }
        val hold = min(6, 3 + (b.g / 25).toInt())
        fun bigUpgrade(line: Line, tier: Int): Boolean = when (line) {
            Line.special -> tier >= 3 && b.foes.count { !it.dead } >= 3
            Line.consumable -> b.cats.any { it.hp < it.maxHp * 0.6f }
            else -> {
                val t = b.autoTarget(line, tier)
                t != null && (if (line == Line.weapon) t.weapon else t.armor) < tier - 1
            }
        }
        val supply = cells.filter { val it = board[it].item!!; it.tier >= hold || bigUpgrade(it.line, it.tier) || need }
            .maxByOrNull { board[it].item!!.tier }
        if (supply != null && b.phase == Phase.WAVE) {
            drag(supply, 600f, Layout.RAIL_CY)
            return
        }
        if (b.energy > 0 && board.emptyCells().isNotEmpty()) b.produce()
    }
}
