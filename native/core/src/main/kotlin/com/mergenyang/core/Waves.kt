package com.mergenyang.core

import kotlin.random.Random

enum class Mode { STAGE, TOWER, WORLD_BOSS }

/** 웨이브 한 개: 일반(list), 정예(elite), 보스(boss) 중 하나 */
data class Wave(
    val list: List<String> = emptyList(),
    val elite: String? = null,
    val boss: String? = null,
    val mid: Boolean = false,
    val minions: List<String> = emptyList(),
)

data class BattleSpec(val mode: Mode, val chapter: Int = 0, val stage: Int = 0, val floor: Int = 1) {
    fun title(d: GameData): String = when (mode) {
        Mode.STAGE -> "${chapter + 1}-${stage + 1} ${d.chapters[chapter].name}"
        Mode.TOWER -> "무한의 탑 ${floor}층"
        Mode.WORLD_BOSS -> "월드보스 도전"
    }
}

object Waves {
    /** 주 단위로 순환하는 월드보스 */
    fun worldBossOfWeek(d: GameData, epochMillis: Long): String =
        d.worldBossOrder[((epochMillis / (7L * 86_400_000L)) % d.worldBossOrder.size).toInt()]

    /** 기획서: 일반 3웨이브 + 보스 1웨이브, 5·10·15 중간 보스, 20 챕터 보스 */
    fun build(d: GameData, spec: BattleSpec, random: Random, epochMillis: Long): List<Wave> = when (spec.mode) {
        Mode.WORLD_BOSS -> listOf(Wave(boss = worldBossOfWeek(d, epochMillis)))
        Mode.TOWER -> tower(d, spec.floor, random)
        Mode.STAGE -> stage(d, spec.chapter, spec.stage, random)
    }

    private fun stage(d: GameData, ch: Int, st: Int, random: Random): List<Wave> {
        val chap = d.chapters[ch]
        val n = 3 + st / 4
        val waves = ArrayList<Wave>()
        repeat(3) { w ->
            waves += Wave(list = List(n + w * 2) { if (st < 2) chap.enemies[0] else chap.enemies.random(random) })
        }
        val s = st + 1
        waves += when {
            s == d.stagesPerChapter -> Wave(boss = chap.boss, minions = chap.enemies.take(2))
            s % 5 == 0 -> Wave(boss = chap.boss, mid = true, minions = listOf(chap.enemies[0]))
            else -> Wave(elite = chap.enemies.random(random), minions = listOf(chap.enemies[0], chap.enemies[0]))
        }
        return waves
    }

    private fun tower(d: GameData, floor: Int, random: Random): List<Wave> {
        val chs = d.chapters
        val pool = chs[minOf(chs.size - 1, (floor - 1) / 3)].enemies + chs[floor % chs.size].enemies
        val waves = ArrayList<Wave>()
        repeat(3) { w -> waves += Wave(list = List(3 + w + floor / 2) { pool.random(random) }) }
        waves += if (floor % 5 == 0) {
            Wave(boss = chs[(floor / 5 - 1) % chs.size].boss, mid = true, minions = List(2) { pool.random(random) })
        } else {
            Wave(elite = pool.random(random), minions = List(3) { pool.random(random) })
        }
        return waves
    }
}
