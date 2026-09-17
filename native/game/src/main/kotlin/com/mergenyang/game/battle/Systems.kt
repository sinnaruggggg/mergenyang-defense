package com.mergenyang.game.battle

import com.github.quillraven.fleks.Entity
import com.github.quillraven.fleks.IteratingSystem
import com.github.quillraven.fleks.World.Companion.family
import com.github.quillraven.fleks.World.Companion.inject

/* Fleks 시스템: 엔티티를 순회하며 전투 규칙(Battle)의 행동을 실행한다. */

class CatSystem(private val battle: Battle = inject()) : IteratingSystem(family { all(CatUnit) }) {
    override fun onTickEntity(entity: Entity) = battle.updateCat(entity[CatUnit], deltaTime)
}

class FoeSystem(private val battle: Battle = inject()) : IteratingSystem(family { all(Foe) }) {
    override fun onTickEntity(entity: Entity) = battle.updateFoe(entity[Foe], deltaTime)
}

class ProjectileSystem(private val battle: Battle = inject()) : IteratingSystem(family { all(Projectile) }) {
    override fun onTickEntity(entity: Entity) = battle.updateProjectile(entity[Projectile], deltaTime)
}

/** 끝난 투사체와 사라진 몬스터 엔티티 제거 */
class CleanupSystem(private val battle: Battle = inject()) : IteratingSystem(family { any(Foe, Projectile) }) {
    override fun onTickEntity(entity: Entity) {
        val foe = entity.getOrNull(Foe)
        if (foe != null && foe.dead && foe.deadT >= 0.5f) {
            battle.foes.remove(foe)
            world -= entity
            return
        }
        val p = entity.getOrNull(Projectile)
        if (p != null && p.done) {
            battle.projectiles.remove(p)
            world -= entity
        }
    }
}
