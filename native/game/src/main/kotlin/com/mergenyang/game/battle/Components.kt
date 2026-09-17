package com.mergenyang.game.battle

import com.badlogic.gdx.graphics.Color
import com.github.quillraven.fleks.Component
import com.github.quillraven.fleks.ComponentType
import com.mergenyang.core.BossDef
import com.mergenyang.core.CatDef
import com.mergenyang.core.EnemyDef
import com.mergenyang.core.Line

/* Fleks ECS 컴포넌트: 전선 고양이, 몬스터·보스, 투사체 */

enum class CatState { IDLE, ATTACK }

class CatUnit(val def: CatDef, val homeX: Float, val y: Float, val baseHp: Float, val baseAtk: Float) : Component<CatUnit> {
    val id get() = def.id
    var x = homeX
    var hp = baseHp
    var maxHp = baseHp
    var weapon = 0
    var armor = 0
    var cd = rnd(0.2f, 0.6f)
    var state = CatState.IDLE
    var animT = 0f
    var struck = false
    var target: Foe? = null
    var down = 0f
    var flash = 0f
    var buffT = 0f
    var poisonT = 0f
    var poisonDps = 0f
    var rageT = 0f
    var shockT = 0f
    var healT = 1.5f
    var lunge = 0f
    val bob = rnd(0f, 6f)
    var sq = 0f
    val isDown get() = down > 0f

    override fun type() = CatUnit
    companion object : ComponentType<CatUnit>()
}

enum class FoeState { ENTER, WALK, FIGHT, ATTACK }

class Dash(val from: Float, val to: Float, val ok: Boolean) {
    var t = 0f
    var hit = false
}

class Foe(
    val enemy: EnemyDef?,
    val bossDef: BossDef?,
    val name: String,
    var x: Float,
    val y: Float,
    var hp: Double,
    val atk: Float,
    val scale: Float,
    val speed: Float,
    val elite: Boolean = false,
    val mid: Boolean = false,
) : Component<Foe> {
    val isBoss get() = bossDef != null
    val world get() = bossDef?.world == true
    val maxHp = hp
    val atkId: String get() = bossDef?.atkId ?: enemy!!.atkId
    val ranged: Float get() = bossDef?.ranged ?: enemy!!.ranged
    val fly: Boolean get() = bossDef?.fly ?: enemy!!.fly
    val shield: Boolean get() = enemy?.shield ?: false
    val armorR: Float get() = enemy?.armor ?: 0f
    val cdBase: Float get() = bossDef?.cd ?: enemy!!.cd

    var state = if (bossDef != null) FoeState.ENTER else FoeState.WALK
    var cd = if (bossDef != null) 2.5f else rnd(0.5f, 1f)
    var animT = 0f
    var struck = false
    var flash = 0f
    var knock = 0f
    val bob = rnd(0f, 6f)
    var spawnT = 0.3f
    var queue = 0
    var dead = false
    var deadT = 0f
    var homeX = x

    // 보스 전용
    var patternT = 9f
    val thresholds = ArrayList<Float>()
    var patterns: List<String> = bossDef?.patterns ?: emptyList()
    var riddle: Line? = null
    var stun = 0f
    var rageT = 0f
    var dash: Dash? = null
    var rageCount = 0
    var shieldHp = 0.0
    var shieldMax = 0.0

    override fun type() = Foe
    companion object : ComponentType<Foe>()
}

enum class ProjKind { ARROW, FIRE, HOLY, SPORE }

class Projectile(
    val kind: ProjKind,
    var x: Float,
    var y: Float,
    val speed: Float,
    val dmg: Float,
    val color: Color,
    val foe: Foe? = null,
    val cat: CatUnit? = null,
    val crit: Boolean = false,
    val magic: Boolean = false,
    val aoe: Float = 0f,
    val poison: Boolean = false,
) : Component<Projectile> {
    val hostile get() = cat != null
    var lx = Float.NaN
    var ly = Float.NaN
    var ang = 0f
    var done = false

    override fun type() = Projectile
    companion object : ComponentType<Projectile>()
}

private fun rnd(a: Float, b: Float) = com.mergenyang.game.rnd(a, b)
