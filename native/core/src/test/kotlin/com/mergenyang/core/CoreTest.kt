package com.mergenyang.core

import java.io.File
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CoreTest {
    private val data = GameData.parse(File(System.getProperty("assetsDir"), "data/gamedata.json").readText())
    private val rules = Rules(data)

    private fun board() = MergeBoard(data.balance.boardCols, data.balance.boardRows, Random(1), data.balance.maxTier)

    @Test
    fun dataTableIsComplete() {
        assertEquals(5, data.cats.size)
        assertEquals(5, data.chapters.size)
        assertEquals(35, data.balance.boardCols * data.balance.boardRows)
        Line.entries.forEach { assertEquals(data.balance.maxTier, data.line(it).names.size) }
        Line.entries.forEach { assertEquals(data.balance.maxTier, data.line(it).files.size) }
        data.chapters.forEach { ch ->
            ch.enemies.forEach { data.enemy(it) }
            data.boss(ch.boss)
            ch.recommended.forEach { data.cat(it) }
        }
        data.worldBossOrder.forEach { assertTrue(data.boss(it).world) }
    }

    @Test
    fun mergeCapFollowsWorkshopLevel() {
        assertEquals(4, rules.maxMergeTier(1))
        assertEquals(5, rules.maxMergeTier(2))
        assertEquals(6, rules.maxMergeTier(4))
        assertEquals(data.balance.maxTier, rules.maxMergeTier(999))
        assertEquals(5 to 2, rules.nextMergeUnlock(1))
        assertNull(rules.nextMergeUnlock(999))
        val b = board()
        b.mergeCap = 4
        b[0].item = b.newItem(Line.weapon, 4)
        b[1].item = b.newItem(Line.weapon, 4)
        assertIs<DropResult.Locked>(b.drop(0, 1))
        b.mergeCap = 5
        assertIs<DropResult.Merged>(b.drop(0, 1))
        assertEquals(5, b[1].item!!.tier)
    }

    @Test
    fun itemValueGrowsByTierMultiplier() {
        assertEquals(7f, rules.itemValue(Line.weapon, 1))
        assertEquals(15f, rules.itemValue(Line.weapon, 2))
        assertEquals(1746f, rules.itemValue(Line.weapon, 8))
    }

    @Test
    fun twoSameItemsMergeIntoNextTier() {
        val b = board()
        b[0].item = b.newItem(Line.weapon, 1)
        b[1].item = b.newItem(Line.weapon, 1)
        val r = b.drop(0, 1)
        assertIs<DropResult.Merged>(r)
        assertNull(b[0].item)
        assertEquals(2, b[1].item!!.tier)
    }

    @Test
    fun differentItemsSwap() {
        val b = board()
        b[0].item = b.newItem(Line.weapon, 1)
        b[1].item = b.newItem(Line.armor, 1)
        assertIs<DropResult.Swapped>(b.drop(0, 1))
        assertEquals(Line.armor, b[0].item!!.line)
    }

    @Test
    fun fiveMergeGivesTwoHigherItems() {
        val b = board()
        listOf(8, 9, 10, 11).forEach { b[it].item = b.newItem(Line.armor, 1) }
        b[30].item = b.newItem(Line.armor, 1)
        val r = b.drop(30, 9) as DropResult.Merged
        assertEquals(3, r.consumed.size)
        val tiers = b.cells.mapNotNull { it.item }.map { it.tier }
        assertEquals(listOf(2, 2), tiers)
    }

    @Test
    fun chainMergesAdjacentSameItem() {
        val b = board()
        b[0].item = b.newItem(Line.weapon, 1)
        b[1].item = b.newItem(Line.weapon, 1)
        b[8].item = b.newItem(Line.weapon, 2)
        b.drop(0, 1)
        val partner = b.chainPartner(1)
        assertEquals(8, partner)
        b.applyChain(1, partner!!)
        assertEquals(3, b[1].item!!.tier)
        assertNull(b[8].item)
    }

    @Test
    fun mergeNextToChestOpensIt() {
        val b = board()
        b[0].item = b.newItem(Line.consumable, 1)
        b[1].item = b.newItem(Line.consumable, 1)
        b[2].item = b.newChest()
        val r = b.drop(0, 1) as DropResult.Merged
        assertEquals(listOf(2), r.chestsOpened)
        assertTrue(!b[2].item!!.chest)
    }

    @Test
    fun frozenCellRejectsDrop() {
        val b = board()
        b[0].item = b.newItem(Line.weapon, 1)
        b[1].frozen = 3f
        assertIs<DropResult.Frozen>(b.drop(0, 1))
    }

    @Test
    fun stageWavesFollowDesign() {
        val w = Waves.build(data, BattleSpec(Mode.STAGE, 0, 19), Random(2), 0)
        assertEquals(4, w.size)
        assertEquals("rat", w[3].boss)
        val mid = Waves.build(data, BattleSpec(Mode.STAGE, 1, 4), Random(2), 0)
        assertTrue(mid[3].mid)
        val normal = Waves.build(data, BattleSpec(Mode.STAGE, 0, 2), Random(2), 0)
        assertTrue(normal[3].elite != null)
    }

    @Test
    fun progressUnlocksInOrder() {
        val p = Progress(data, SaveData())
        assertEquals(0, p.unlockedChapter())
        repeat(20) { p.save.stars["0-$it"] = 1 }
        assertEquals(1, p.unlockedChapter())
        assertEquals(0, p.unlockedStage(1))
    }

    @Test
    fun saveRoundTrip() {
        val s = SaveData(gold = 1234)
        s.stars["0-0"] = 3
        val back = SaveData.fromJson(s.toJson())
        assertEquals(1234L, back.gold)
        assertEquals(3, back.stars["0-0"])
        assertEquals(800L, SaveData.fromJson("broken").gold)
    }

    @Test
    fun upgradeDescriptions() {
        val regen = data.forgeUpgrades.first { it.id == "energyRegen" }
        assertEquals("2.60초마다 1 회복", regen.describe(0).replace(',', '.'))
        val auto = data.forgeUpgrades.first { it.id == "autoMerge" }
        assertEquals("대장장이 냥이가 스스로 생산", auto.describe(0))
        assertEquals("13초마다 무료 생산", auto.describe(1))
    }
}
