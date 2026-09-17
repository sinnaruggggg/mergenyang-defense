package com.mergenyang.core

import kotlin.math.pow
import kotlin.math.roundToInt

/** 전투·성장 수치 공식. 클라이언트와 서버가 같은 공식을 쓰도록 한곳에 모은다. */
class Rules(val data: GameData) {
    private val b get() = data.balance

    val maxTier: Int get() = b.maxTier

    /** 공방 레벨로 해금된 최고 합성 단계 (기획: 처음 4단계, 레벨이 오를수록 한 단계씩) */
    fun maxMergeTier(workshopLevel: Int): Int =
        (b.freeMergeTier + b.mergeUnlockLevels.count { it <= workshopLevel }).coerceAtMost(b.maxTier)

    /** 다음 단계를 열려면 필요한 공방 레벨 (더 열 것이 없으면 null) */
    fun nextMergeUnlock(workshopLevel: Int): Pair<Int, Int>? {
        val tier = maxMergeTier(workshopLevel) + 1
        if (tier > b.maxTier) return null
        val need = b.mergeUnlockLevels.getOrNull(tier - b.freeMergeTier - 1) ?: return null
        return tier to need
    }

    fun tierMul(tier: Int): Float = b.tierMul.pow(tier - 1)

    /** 무기=공격력, 방어구=방어력, 소모품=회복량, 특수=광역 피해 (스테이지 보정 전) */
    fun itemValue(line: Line, tier: Int): Float = (data.line(line).base * tierMul(tier)).roundToInt().toFloat()

    /** 챕터·스테이지를 하나의 난이도 축으로 */
    fun globalStage(chapter: Int, stage: Int): Int = chapter * data.stagesPerChapter + stage

    fun stageHp(g: Float): Float = 1 + g * b.hpLinear + g * g * b.hpQuad
    fun stageAtk(g: Float): Float = 1 + g * b.atkLinear + g * g * b.atkQuad

    /** 장비 숙련도 개념: 뒤 스테이지일수록 같은 단계 아이템도 강해진다 */
    fun itemPower(g: Float): Float = 1 + g * b.itemPowerPerStage

    fun waveMul(waveIndex: Int): Float = b.waveMul.getOrElse(waveIndex) { 1f }

    fun catMul(level: Int): Float = 1 + (level - 1) * b.catLevelStep
    fun catLevelCost(level: Int): Int = (b.catCostBase * b.catCostGrowth.pow(level - 1)).roundToInt()

    fun catDefense(cat: CatDef, armorTier: Int): Float {
        val armor = if (armorTier > 0) itemValue(Line.armor, armorTier) else 0f
        return cat.def + armor * (if (cat.id == TANK) 1.5f else 1f)
    }

    fun catArmorHp(cat: CatDef, armorTier: Int, itemPower: Float): Float {
        if (armorTier <= 0) return 0f
        return itemValue(Line.armor, armorTier) * itemPower * b.armorHpMul * (if (cat.id == TANK) 1.5f else 1f)
    }

    fun damageTaken(raw: Float, defense: Float): Float = raw * 100f / (100f + defense)

    /** 스테이지 별 평가: 클리어 / 체력 50% / 150초 이내 또는 피버 2회 */
    fun starChecks(hpRatio: Float, seconds: Float, feverCount: Int): List<Boolean> =
        listOf(true, hpRatio >= 0.5f, seconds <= 150f || feverCount >= 2)

    fun power(levels: Map<String, Int>): Int =
        data.cats.sumOf { ((it.atk * 8 + it.hp) * catMul(levels[it.id] ?: 1)).roundToInt() }

    /** 장비를 교체할 때 이전 장비를 돌려주는 골드 */
    fun refundGold(tier: Int): Int = (5 * tierMul(tier)).roundToInt()

    fun lineRates(weaponRateLevel: Int): Map<Line, Float> {
        val bonus = weaponRateLevel * 1.5f
        val r = b.lineRates
        return mapOf(
            Line.weapon to r.getValue(Line.weapon) + bonus,
            Line.armor to r.getValue(Line.armor) + bonus,
            Line.consumable to r.getValue(Line.consumable) - bonus,
            Line.special to r.getValue(Line.special) - bonus,
        )
    }

    companion object {
        const val TANK = "tank"
        const val HEALER = "healer"
    }
}
