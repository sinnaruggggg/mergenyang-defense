package com.mergenyang.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.pow
import kotlin.math.roundToInt

/** 아이템 라인. JSON 키와 이름이 같다. */
@Suppress("EnumEntryName")
enum class Line { weapon, armor, consumable, special }

@Serializable
data class ItemLineDef(
    val name: String,
    val color: String,
    val base: Float,
    val effect: String,
    val files: List<String>,
    val names: List<String>,
)

@Serializable
data class CatDef(
    val id: String,
    val name: String,
    val role: String,
    val atkId: String,
    val hp: Float,
    val atk: Float,
    val cd: Float,
    val range: Float,
    val crit: Float,
    val def: Float = 0f,
    val heal: Float = 0f,
    val aoe: Float = 0f,
    val magic: Boolean = false,
    val melee: Boolean = false,
    val prefer: Line,
    val desc: String,
    /** 화면에 그릴 때의 상대 크기 (뚱냥이는 덩치가 커 보이게) */
    val viewScale: Float = 1f,
    /** 공격 프레임(0=준비, 1=타격)별로 대기 프레임 몸 크기에 맞추는 [배율, 가로 이동(512px 캔버스 기준)] */
    val atkFit: List<List<Float>> = listOf(listOf(1f, 0f), listOf(1f, 0f)),
)

@Serializable
data class EnemyDef(
    val id: String,
    val name: String,
    val atkId: String,
    val hp: Float,
    val atk: Float,
    val cd: Float,
    val speed: Float,
    val scale: Float,
    val gold: Int,
    val ranged: Float = 0f,
    val fly: Boolean = false,
    val poison: Boolean = false,
    val shield: Boolean = false,
    val armor: Float = 0f,
)

@Serializable
data class BossDef(
    val id: String,
    val name: String,
    val atkId: String,
    val hp: Double,
    val atk: Float,
    val cd: Float,
    val scale: Float,
    val patterns: List<String>,
    val tip: String,
    val ranged: Float = 0f,
    val fly: Boolean = false,
    val shield: Boolean = false,
    val world: Boolean = false,
    val meleeHalf: Boolean = false,
    val harden: Boolean = false,
)

@Serializable
data class ChapterDef(
    val name: String,
    val enemies: List<String>,
    val boss: String,
    val rule: String,
    val recommended: List<String>,
)

@Serializable
data class UpgradeDef(
    val id: String,
    val name: String,
    val icon: String,
    val max: Int,
    val desc: String,
    val descZero: String? = null,
    val valueBase: Float,
    val valuePer: Float,
    val decimals: Int = 0,
    val costBase: Float,
    val costGrowth: Float,
) {
    fun value(level: Int): Float = valueBase + valuePer * level

    fun describe(level: Int): String {
        if (level == 0 && descZero != null) return descZero
        val v = value(level)
        val text = if (decimals == 0) v.roundToInt().toString() else "%.${decimals}f".format(v)
        return desc.replace("{v}", text)
    }

    fun cost(level: Int): Int = (costBase * costGrowth.pow(level)).roundToInt()
}

@Serializable
data class Balance(
    val tierMul: Float,
    val hpLinear: Float,
    val hpQuad: Float,
    val atkLinear: Float,
    val atkQuad: Float,
    val itemPowerPerStage: Float,
    val armorHpMul: Float,
    val catLevelStep: Float,
    val catCostBase: Float,
    val catCostGrowth: Float,
    val waveMul: List<Float>,
    val eliteHp: Float,
    val eliteAtk: Float,
    val shieldFactor: Float,
    val lineRates: Map<Line, Float>,
    val feverMax: Float,
    val stageEnergyCost: Int,
    val lobbyEnergyMax: Int,
    val lobbyEnergyRegenMs: Long,
    val boardCols: Int,
    val boardRows: Int,
    /** 아이템 최고 단계 */
    val maxTier: Int,
    /** 공방 레벨과 상관없이 합성 가능한 단계 */
    val freeMergeTier: Int,
    /** freeMergeTier+1 단계부터 한 단계씩 해금되는 공방 레벨 */
    val mergeUnlockLevels: List<Int>,
    val breakSeconds: Float,
    val catReviveSeconds: Float,
    val worldBossSeconds: Float,
    val worldBossTries: Int,
    val offlineCapMinutes: Int,
)

@Serializable
data class GameData(
    val stagesPerChapter: Int,
    val lines: Map<Line, ItemLineDef>,
    val cats: List<CatDef>,
    val smithAtkFit: List<List<Float>>,
    val enemies: List<EnemyDef>,
    val bosses: List<BossDef>,
    val worldBossOrder: List<String>,
    val chapters: List<ChapterDef>,
    val forgeUpgrades: List<UpgradeDef>,
    val smithUpgrades: List<UpgradeDef>,
    val balance: Balance,
) {
    private val catMap by lazy { cats.associateBy { it.id } }
    private val enemyMap by lazy { enemies.associateBy { it.id } }
    private val bossMap by lazy { bosses.associateBy { it.id } }

    val catIds: List<String> get() = cats.map { it.id }

    fun cat(id: String): CatDef = catMap.getValue(id)
    fun enemy(id: String): EnemyDef = enemyMap.getValue(id)
    fun boss(id: String): BossDef = bossMap.getValue(id)
    fun line(line: Line): ItemLineDef = lines.getValue(line)
    fun itemName(line: Line, tier: Int): String = line(line).names[tier - 1]

    companion object {
        val json = Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }

        fun parse(text: String): GameData = json.decodeFromString(serializer(), text)
    }
}
