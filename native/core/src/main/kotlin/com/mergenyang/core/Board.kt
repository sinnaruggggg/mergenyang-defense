package com.mergenyang.core

import kotlin.random.Random

/** 보드 위 한 개체: 아이템 또는 보물상자. pop/fly 값은 화면 연출용 상태다. */
class BoardItem(val uid: Int, val chest: Boolean, val line: Line, var tier: Int) {
    var pop = 0f
    var flyT = 0f
    var flyMax = 0f

    fun sameAs(o: BoardItem) = !chest && !o.chest && line == o.line && tier == o.tier
}

class Cell {
    var item: BoardItem? = null
    var frozen = 0f
}

sealed interface DropResult {
    data object Cancelled : DropResult
    data object Frozen : DropResult
    data class Moved(val to: Int) : DropResult
    data class Swapped(val to: Int) : DropResult

    /** 공방 레벨이 모자라 합성이 막힘 */
    data class Locked(val tier: Int) : DropResult

    /**
     * @param cell 합성된 칸
     * @param bonusCell 5개 합성 시 추가 상위 아이템이 생긴 칸
     * @param consumed 5개 합성으로 빨려 들어간 칸들
     * @param chestsOpened 인접 합성으로 열린 상자 칸
     */
    data class Merged(
        val cell: Int,
        val tier: Int,
        val bonusCell: Int?,
        val consumed: List<Int>,
        val chestsOpened: List<Int>,
    ) : DropResult
}

data class ChainResult(val cell: Int, val from: Int, val tier: Int, val chestsOpened: List<Int>)

/** 7x5 머지 보드 규칙 (기획서: 같은 라인·같은 단계 2개 → 다음 단계 1개) */
class MergeBoard(val cols: Int, val rows: Int, private val random: Random = Random.Default, val maxTier: Int = 8) {
    /** 공방 레벨로 해금된 합성 상한 (이 단계까지만 합쳐진다) */
    var mergeCap: Int = maxTier
    val cells = Array(cols * rows) { Cell() }
    val size get() = cells.size
    private var nextUid = 1

    fun newItem(line: Line, tier: Int) = BoardItem(nextUid++, false, line, tier)
    fun newChest() = BoardItem(nextUid++, true, Line.special, 0)

    operator fun get(i: Int): Cell = cells[i]

    fun neighbors(i: Int): List<Int> {
        val c = i % cols
        val r = i / cols
        val out = ArrayList<Int>(4)
        if (c > 0) out += i - 1
        if (c < cols - 1) out += i + 1
        if (r > 0) out += i - cols
        if (r < rows - 1) out += i + cols
        return out
    }

    fun emptyCells(): List<Int> = cells.indices.filter { cells[it].item == null && cells[it].frozen <= 0f }

    /** 드래그·합성 가능한 칸: 아이템이 있고, 얼지 않았고, 날아오는 중이 아니다 */
    fun canUse(i: Int): Boolean {
        val c = cells[i]
        val it = c.item ?: return false
        return c.frozen <= 0f && it.flyT <= 0f
    }

    fun tick(dt: Float) {
        for (c in cells) if (c.frozen > 0f) c.frozen = (c.frozen - dt).coerceAtLeast(0f)
    }

    /** 같은 아이템이 4방향으로 연결된 칸들 (시작 칸 포함) */
    fun group(start: Int, line: Line, tier: Int, exclude: Int): List<Int> {
        val seen = linkedSetOf(start)
        val queue = ArrayDeque(listOf(start))
        while (queue.isNotEmpty()) {
            val i = queue.removeFirst()
            for (n in neighbors(i)) {
                if (n in seen || n == exclude || !canUse(n)) continue
                val it = cells[n].item!!
                if (!it.chest && it.line == line && it.tier == tier) {
                    seen += n
                    queue += n
                }
            }
        }
        return seen.toList()
    }

    fun drop(from: Int, to: Int): DropResult {
        if (to < 0 || to == from) return DropResult.Cancelled
        val src = cells[from].item ?: return DropResult.Cancelled
        val dst = cells[to]
        if (dst.frozen > 0f) return DropResult.Frozen
        val target = dst.item
        if (target != null && target.flyT > 0f) return DropResult.Cancelled
        if (target == null) {
            dst.item = src
            cells[from].item = null
            return DropResult.Moved(to)
        }
        if (src.sameAs(target) && target.tier < maxTier) {
            if (target.tier >= mergeCap) return DropResult.Locked(target.tier + 1)
            cells[from].item = null
            val baseTier = target.tier
            val grp = group(to, target.line, baseTier, from)
            var bonus: Int? = null
            val consumed = ArrayList<Int>()
            if (grp.size >= 4) {
                // 5개 합성: 드래그한 1개 + 대상 + 연결된 3개 → 상위 2개
                val extra = grp.filter { it != to }.take(3)
                extra.forEach { cells[it].item = null }
                consumed += extra
                bonus = extra.first()
                cells[bonus].item = newItem(target.line, baseTier + 1)
            }
            target.tier = baseTier + 1
            return DropResult.Merged(to, target.tier, bonus, consumed, openChestsAround(to))
        }
        if (src.chest || target.chest || !src.sameAs(target) || target.tier >= maxTier) {
            dst.item = src
            cells[from].item = target
            return DropResult.Swapped(to)
        }
        return DropResult.Cancelled
    }

    /** 연쇄 합성 상대: 인접한 같은 아이템 */
    fun chainPartner(cell: Int, busy: Int = -1): Int? {
        val it = cells[cell].item ?: return null
        if (it.chest || it.tier >= maxTier || it.tier >= mergeCap || cells[cell].frozen > 0f) return null
        return neighbors(cell).firstOrNull { n -> n != busy && canUse(n) && cells[n].item!!.sameAs(it) }
    }

    fun applyChain(cell: Int, partner: Int): ChainResult {
        val it = cells[cell].item!!
        cells[partner].item = null
        it.tier += 1
        return ChainResult(cell, partner, it.tier, openChestsAround(cell))
    }

    private fun openChestsAround(cell: Int): List<Int> {
        val opened = ArrayList<Int>()
        for (n in neighbors(cell)) {
            val c = cells[n].item ?: continue
            if (c.chest && c.flyT <= 0f) {
                cells[n].item = newItem(Line.entries.random(random), random.nextInt(2, 4))
                opened += n
            }
        }
        return opened
    }

    /** 생산: 라인 확률표에 따라 1단계(또는 2단계) 아이템 */
    fun rollLine(rates: Map<Line, Float>): Line {
        val total = rates.values.sum()
        var r = random.nextFloat() * total
        for ((line, w) in rates) {
            r -= w
            if (r < 0f) return line
        }
        return Line.weapon
    }

}
