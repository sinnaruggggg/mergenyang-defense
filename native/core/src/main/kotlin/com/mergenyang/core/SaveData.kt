package com.mergenyang.core

import kotlinx.serialization.Serializable
import kotlin.math.floor
import kotlin.math.min

/** 계정 진행 상황. 로컬(DataStore)에 저장하고, 서버 연동 시 같은 구조를 쓴다. */
@Serializable
data class SaveData(
    var gold: Long = 800,
    var gems: Int = 50,
    var energy: Int = 50,
    var energyTime: Long = 0,
    var lastSeen: Long = 0,
    val cats: MutableMap<String, Int> = mutableMapOf("warrior" to 1, "tank" to 1, "archer" to 1, "healer" to 1, "wizard" to 1),
    var squad: MutableList<String> = mutableListOf("warrior", "healer"),
    val forge: MutableMap<String, Int> = mutableMapOf(),
    val smith: MutableMap<String, Int> = mutableMapOf(),
    val stars: MutableMap<String, Int> = mutableMapOf(),
    var tutorialDone: Boolean = false,
    var towerBest: Int = 0,
    var bossBest: Long = 0,
    var bossTotal: Long = 0,
    val maxTier: MutableMap<String, Int> = mutableMapOf(),
    val legend: MutableMap<String, Boolean> = mutableMapOf(),
    var dailyChest: String = "",
    var bossDay: String = "",
    var bossTries: Int = 3,
    var bgm: Boolean = true,
    var sfx: Boolean = true,
    var plays: Int = 0,
    /** 전투 배속 (1 또는 2) */
    var battleSpeed: Int = 1,
) {
    fun toJson(): String = GameData.json.encodeToString(serializer(), this)

    companion object {
        fun fromJson(text: String?): SaveData =
            if (text.isNullOrBlank()) SaveData() else runCatching { GameData.json.decodeFromString(serializer(), text) }.getOrElse { SaveData() }
    }
}

/** 저장 데이터 위에서 동작하는 진행도 계산 */
class Progress(val data: GameData, val save: SaveData) {
    private val rules = Rules(data)
    private val b get() = data.balance

    fun catLevel(id: String) = save.cats[id] ?: 1
    fun forge(id: String) = save.forge[id] ?: 0
    fun smith(id: String) = save.smith[id] ?: 0
    fun stars(ch: Int, st: Int) = save.stars["$ch-$st"] ?: 0

    fun unlockedChapter(): Int {
        var ch = 0
        while (ch < data.chapters.size - 1 && stars(ch, data.stagesPerChapter - 1) > 0) ch++
        return ch
    }

    fun unlockedStage(ch: Int): Int {
        var s = 0
        while (s < data.stagesPerChapter - 1 && stars(ch, s) > 0) s++
        return s
    }

    fun chapterStars(ch: Int) = (0 until data.stagesPerChapter).sumOf { stars(ch, it) }
    fun totalStars() = save.stars.values.sum()
    fun power() = rules.power(save.cats)
    fun workshopLevel() = 1 + save.forge.values.sum() + save.smith.values.sum()
    fun workshopMaxLevel() = 1 + data.forgeUpgrades.sumOf { it.max } + data.smithUpgrades.sumOf { it.max }

    fun towerOpen() = stars(0, 4) > 0
    fun worldBossOpen() = stars(0, 9) > 0

    /** 로비 에너지: 일정 시간마다 1 회복 */
    fun tickEnergy(now: Long) {
        val per = b.lobbyEnergyRegenMs
        if (save.energy >= b.lobbyEnergyMax) {
            save.energyTime = now
            return
        }
        if (save.energyTime == 0L) save.energyTime = now
        val n = ((now - save.energyTime) / per).toInt()
        if (n > 0) {
            save.energy = min(b.lobbyEnergyMax, save.energy + n)
            save.energyTime += n * per
        }
    }

    fun energyEtaMs(now: Long): Long = maxOf(0L, b.lobbyEnergyRegenMs - (now - save.energyTime))

    /** 방치 보상: 최대 8시간, 별이 많을수록 더 많이 쌓인다 */
    fun offline(now: Long): Pair<Long, Float> {
        if (save.lastSeen == 0L) save.lastSeen = now
        val mins = min(b.offlineCapMinutes.toFloat(), (now - save.lastSeen) / 60_000f).coerceAtLeast(0f)
        return floor(mins * (4 + totalStars() * 0.6f)).toLong() to mins
    }

    fun refreshBossTries(today: String) {
        if (save.bossDay != today) {
            save.bossDay = today
            save.bossTries = b.worldBossTries
        }
    }

    fun recordTier(line: Line, tier: Int) {
        if (tier > (save.maxTier[line.name] ?: 0)) save.maxTier[line.name] = tier
    }

    fun setSquadMember(id: String) {
        if (id in save.squad) return
        save.squad = (listOf(save.squad.last()) + id).toMutableList()
    }
}
