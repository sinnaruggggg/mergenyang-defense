package com.mergenyang.game.screens

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.scenes.scene2d.Group
import com.badlogic.gdx.utils.Align
import com.mergenyang.core.BattleSpec
import com.mergenyang.core.Mode
import com.mergenyang.core.Waves
import com.mergenyang.game.Chars
import com.mergenyang.game.Gfx
import com.mergenyang.game.UpdateCheck
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.rnd
import com.mergenyang.game.ui.DrawActor
import com.mergenyang.game.ui.HitActor
import com.mergenyang.game.ui.ImgActor
import com.mergenyang.game.ui.NyButton
import com.mergenyang.game.ui.PanelActor
import com.mergenyang.game.ui.TextActor
import com.mergenyang.game.ui.at
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sign
import kotlin.math.sin

private val SPARK = Gfx.color("ffcf5aff")
private val EMBER = Gfx.color("ffb35aff")

// ======================= 타이틀 =======================
class TitleScreen(game: MergeNyangGame) : MenuScreen(game, "workshop") {
    private var lastCyc = 0f

    override fun onBack() = Unit

    override fun update(delta: Float) {
        val cyc = time % 1.1f
        if (cyc < lastCyc) {
            fx.sparks(560f, 1370f, SPARK, 18, -PI.toFloat() / 2, 2.4f)
            fx.burst(560f, 1370f, EMBER, 10, 400f, 10f, 0.4f)
            game.audio.play("produce", volume = 0.6f)
        }
        lastCyc = cyc
        if (rnd(0f, 1f) < 0.3f) fx.p {
            x = rnd(60f, 300f); y = rnd(700f, 900f); vx = rnd(-20f, 20f); vy = rnd(-160f, -60f)
            size = rnd(3f, 7f); color.set(if (rnd(0f, 1f) < 0.5f) EMBER else SPARK); life = rnd(1f, 2f); drag = 0.99f
        }
    }

    override fun build(g: Group) {
        g.at(DrawActor {
            Gfx.fullRect(DIMMER, 0.15f)
            val s = 1f + sin(time * 2f) * 0.02f
            Gfx.nine("ui/title-banner", 540f - 440f * s, 380f - 150f * s, 880f * s, 300f * s, 110, 0.9f * s)
            Gfx.text("머지냥 디펜스", 540f, 368f, 116f * s, Gfx.color("fff4dcff"), outline = true)
            Gfx.text("MERGE NYANG DEFENSE", 540f, 468f, 34f * s, Gfx.color("7a4a22ff"))
            Chars.shadow(190f, 1480f, 280f)
            Chars.idle("warrior", 190f, 1480f, 0.72f, time)
            Chars.shadow(870f, 1480f, 280f)
            Chars.idle("healer", 870f, 1480f, 0.75f, time, phase = 1f)
            val cyc = time % 1.1f
            Chars.shadow(540f, 1505f, 320f)
            Gfx.fit("icons/anvil", 660f, 1452f, 250f, 184f)
            Chars.catAttack("smith", if (cyc < 0.18f) 1 else 0, 520f, 1510f, 0.9f, sy = if (cyc < 0.1f) 0.95f else 1f)
            val a = 0.55f + 0.45f * sin(time * 4f)
            Gfx.panel(240f, 1620f, 600f, 120f)
            Gfx.text("터치하여 시작", 540f, 1680f, 50f, alpha = a)
            Gfx.text("고양이가 만들고, 고양이가 싸운다!", 540f, 1820f, 32f, Color.WHITE, outline = true)
            Gfx.text(if (game.platform.version == "dev") "개발 빌드 · Android 네이티브" else "v${game.platform.version} · Android 네이티브", 540f, 1880f, 22f, Color.WHITE, outline = true)
        }, 0f, 0f, Gfx.W, Gfx.H)
        g.at(HitActor {
            game.audio.play("produce")
            game.audio.play("meow")
            fx.flash(Color.WHITE, 0.6f)
            game.go<LobbyScreen>()
        }, 0f, -Gfx.ext, Gfx.W, Gfx.H + Gfx.ext * 2)
    }

    companion object { val DIMMER: Color = Gfx.color("281408ff") }
}

// ======================= 로비 (새 대장간 UI) =======================
class LobbyScreen(game: MergeNyangGame) : MenuScreen(game, "lobby-room") {
    private var lastCyc = 0f
    override val coverBackground = true

    override fun onBack() = Unit

    override fun update(delta: Float) {
        // 사이드로드 APK는 자동 갱신이 없으므로 새 버전이 확인되면 한 번 알린다
        if (!UpdateCheck.notified && UpdateCheck.latest != null && !popupOpen && !game.transitioning) {
            UpdateCheck.notified = true
            showPopup("update")
        }
        // 화덕에서 피어오르는 불티
        if (rnd(0f, 1f) < 0.5f) fx.p {
            x = Gfx.coverX(rnd(58f, 155f)); y = Gfx.coverY(rnd(700f, 772f)); vx = rnd(-25f, 25f); vy = rnd(-190f, -80f)
            size = rnd(3f, 7f); color.set(if (rnd(0f, 1f) < 0.5f) EMBER else SPARK); life = rnd(0.8f, 1.8f); drag = 0.99f
        }
        val cyc = time % 1.6f
        if (cyc < lastCyc) {
            fx.sparks(Gfx.coverX(106f), Gfx.coverY(702f), SPARK, 8, -PI.toFloat() / 2, 1.6f)   // 화덕 불꽃 (cover 배경 위치)
            fx.sparks(812f, 792f + Gfx.ext, SPARK, 5, -PI.toFloat() / 2, 2.4f)   // 달궈진 망치 머리 (대장장이는 아래 묶음)
        }
        lastCyc = cyc
    }

    override fun build(g: Group) {
        // 대장장이 반신 그림 (아래쪽은 보상 카드 뒤로 들어간다)
        // 긴 화면: 상단 묶음은 화면 위, 대장장이와 하단 카드는 화면 아래에 붙인다
        val low = anchorBottom(g)
        low.at(DrawActor { Gfx.fit("bg/lobby-smith", 570f, 897f, 720f, 720f) }, 0f, 300f, Gfx.W, 900f)
        topBar(g)
        val up = anchorTop(g)
        up.at(PanelActor("ui/title-banner", 100, 0.5f), 150f, 108f, 780f, 124f)
        up.at(TextActor("냥이들의 대장간", 52f), 150f, 108f, 780f, 124f)
        up.at(NyButton("", "cream", icon = "icons/gear", iconSize = 60f) { showPopup("settings") }, 946f, 118f, 110f, 100f)
        up.at(NyButton("도감", "cream", icon = "icons/book", textSize = 30f) { showPopup("codex") }, 24f, 250f, 200f, 80f)
        up.at(NyButton("도움말", "mint", icon = "icons/help", textSize = 30f) { showPopup("help") }, 856f, 250f, 200f, 80f)

        // 방치 보상 카드
        low.at(DrawActor {
            Gfx.fit("lobby/reward", 540f, 1210f, 1000f, 157f)
            Gfx.fit("icons/chest", 120f, 1210f, 106f, 106f)
            val (gold, mins) = progress.offline(game.now)
            Gfx.text("방치 보상", 195f, 1172f, 34f, align = Align.left)
            Gfx.text("${(mins / 60).toInt()}시간 ${(mins % 60).toInt()}분 · 최대 8시간", 195f, 1214f, 25f, Gfx.MUTED, Align.left)
            Gfx.text("${fmt(gold)} 골드", 195f, 1245f, 24f, GOLD_TEXT, Align.left)
            Gfx.fit("lobby/gold", 880f, 1210f, 245f, 69f, if (gold < 1) 0.55f else 1f)
            Gfx.text("받기", 880f, 1207f, 29f, if (gold < 1) DIM_TEXT else DEEP_BROWN)
        }, 0f, 1120f, Gfx.W, 180f)
        low.at(HitActor {
            val (gold, _) = progress.offline(game.now)
            if (gold >= 1) {
                save.gold += gold
                save.lastSeen = game.now
                game.persist()
                game.audio.play("chest")
                fx.collect(880f, 1210f + Gfx.ext, "icons/gold", 400f, 56f, 20, true) { game.audio.play("coin") }
                game.toast.show("골드 ${fmt(gold)} 획득!", Gfx.GOLD)
                rebuild()
            }
        }, 758f, 1175f, 245f, 69f)

        // 공방 레벨 카드 (합성 해금 안내 포함)
        val lvl = progress.workshopLevel()
        val maxLv = progress.workshopMaxLevel()
        val cap = game.rules.maxMergeTier(lvl)
        val next = game.rules.nextMergeUnlock(lvl)
        low.at(DrawActor {
            Gfx.fit("lobby/level", 540f, 1375f, 1000f, 147f)
            Gfx.text("공방 Lv.$lvl", 90f, 1336f, 34f, align = Align.left)
            Gfx.text("전투력 ${fmt(progress.power())}", 990f, 1337f, 28f, Gfx.MUTED, Align.right)
            Gfx.bar(90f, 1370f, 900f, 20f, lvl / maxLv.toFloat(), "ui/progress-mint")
            val tip = if (next != null) "합성 ${cap}단계까지 · Lv.${next.second}에서 ${next.first}단계 해금"
            else "모든 합성 단계를 열었어요!"
            Gfx.text(tip, 90f, 1404f, 23f, Gfx.MUTED, Align.left)
        }, 0f, 1300f, Gfx.W, 150f)

        // 성장 버튼 두 개
        low.at(DrawActor {
            Gfx.fit("lobby/gold", 285f, 1526f, 490f, 137f)
            Gfx.fit("lobby/mint", 795f, 1526f, 490f, 137f)
            Gfx.fit("icons/forge", 140f, 1526f, 78f, 78f)
            Gfx.fit("icons/paw", 649f, 1526f, 70f, 70f)
            Gfx.text("대장간 성장", 335f, 1524f, 34f)
            Gfx.text("머지냥이 성장", 848f, 1524f, 32f)
        }, 0f, 1450f, Gfx.W, 145f)
        low.at(HitActor { game.audio.play("click"); GrowthScreen.tab = "forge"; game.go<GrowthScreen>() }, 40f, 1458f, 490f, 137f)
        low.at(HitActor { game.audio.play("click"); GrowthScreen.tab = "smith"; game.go<GrowthScreen>() }, 550f, 1458f, 490f, 137f)

        // 모험 떠나기
        val ch = progress.unlockedChapter()
        val st = progress.unlockedStage(ch)
        low.at(DrawActor {
            Gfx.fit("lobby/adventure", 540f, 1673f, 1000f, 136f)
            Gfx.fit("icons/sword", 304f, 1664f, 76f, 76f)
            Gfx.text("모험 떠나기", 595f, 1646f, 44f)
            Gfx.text("다음: ${ch + 1}-${st + 1} ${data.chapters[ch].name}", 595f, 1684f, 24f, ADVENTURE_SUB)
        }, 0f, 1600f, Gfx.W, 145f)
        low.at(HitActor { game.audio.play("click"); game.go<ModesScreen>() }, 40f, 1605f, 1000f, 136f)
        tabBar(g, "lobby")
    }

    companion object {
        val GOLD_TEXT: Color = Gfx.color("98651bff")
        val DEEP_BROWN: Color = Gfx.color("65441cff")
        val DIM_TEXT: Color = Gfx.color("8e795eff")
        val ADVENTURE_SUB: Color = Gfx.color("86612fff")
    }
}

// ======================= 고양이 =======================
class CatsScreen(game: MergeNyangGame) : MenuScreen(game, "town") {
    private var sel = ""

    override fun show() {
        if (sel.isEmpty()) sel = save.squad.first()
        super.show()
    }

    override fun build(g: Group) {
        topBar(g)
        header(g, "우리 고양이들", "레벨업하고 출전할 고양이 2마리를 골라요")
        g.at(PanelActor("ui/panel-mint"), 30f, 310f, 1020f, 420f)
        g.at(TextActor("출전 중인 고양이", 36f, align = Align.left), 80f, 330f, 500f, 60f)
        g.at(TextActor("편성 ${save.squad.size} / 2", 30f, Gfx.color("2a5a3aff"), Align.right), 700f, 330f, 300f, 60f)
        g.at(DrawActor {
            save.squad.forEachIndexed { i, id ->
                val x = 290f + i * 500f
                Chars.shadow(x, 660f, 220f)
                Chars.idle(id, x, 660f, 0.58f, time, phase = i.toFloat())
                Gfx.text("${data.cat(id).name} Lv.${progress.catLevel(id)}", x, 700f, 32f)
            }
        }, 30f, 310f, 1020f, 420f)

        g.at(TextActor("보유 고양이", 36f, Color.WHITE, Align.left, outline = true), 60f, 755f, 400f, 50f)
        data.cats.forEachIndexed { i, c ->
            val x = 30f + i * 206f
            val y = 810f
            if (sel == c.id) g.at(PanelActor("ui/button-yellow-selected", 60, 0.6f), x - 6f, y - 6f, 208f, 262f)
            g.at(PanelActor(if (c.id in save.squad) "ui/panel-mint" else "ui/panel-cream"), x, y, 196f, 250f)
            g.at(ImgActor("portraits/cat-${c.id}"), x + 13f, y + 20f, 170f, 160f)
            g.at(TextActor(c.name, 28f), x + 8f, y + 180f, 180f, 40f)
            g.at(TextActor("Lv.${progress.catLevel(c.id)}", 24f, Gfx.MUTED), x, y + 214f, 196f, 36f)
            if (c.id in save.squad) g.at(ImgActor("icons/flag"), x + 148f, y + 8f, 44f, 44f)
            g.at(HitActor { sel = c.id; game.audio.play("meow"); rebuild() }, x, y, 196f, 250f)
        }

        val d = data.cat(sel)
        val lv = progress.catLevel(sel)
        val mul = game.rules.catMul(lv)
        val nmul = game.rules.catMul(lv + 1)
        g.at(PanelActor("ui/panel-cream"), 30f, 1080f, 1020f, 650f)
        g.at(DrawActor {
            Chars.shadow(220f, 1440f, 260f)
            val cyc = time % 1.2f
            if (cyc < 0.25f) Chars.catAttack(sel, 1, 220f, 1440f, 0.62f) else Chars.idle(sel, 220f, 1440f, 0.62f, time)
        }, 30f, 1080f, 380f, 400f)
        g.at(TextActor(d.name, 48f, align = Align.left), 400f, 1110f, 600f, 60f)
        g.at(TextActor("Lv.$lv · ${d.role}", 30f, Gfx.MUTED, Align.left), 400f, 1170f, 600f, 44f)
        val rows = listOf(
            listOf("icons/heart", "체력", "${(d.hp * mul).toInt()}", "→ ${(d.hp * nmul).toInt()}"),
            listOf("icons/sword", "공격력", "${(d.atk * mul).toInt()}", "→ ${(d.atk * nmul).toInt()}"),
            listOf("icons/clock", "공격 속도", "${d.cd}초", ""),
            listOf("icons/star", "치명타", "${(d.crit * 100).toInt()}%", ""),
        )
        rows.forEachIndexed { i, r ->
            val y = 1225f + i * 58f
            g.at(ImgActor(r[0]), 400f, y, 42f, 42f)
            g.at(TextActor(r[1], 30f, align = Align.left), 460f, y - 4f, 250f, 50f)
            g.at(TextActor(r[2], 30f, align = Align.right), 600f, y - 4f, 200f, 50f)
            if (r[3].isNotEmpty()) g.at(TextActor(r[3], 30f, Gfx.color("2a9a5aff"), Align.left), 820f, y - 4f, 200f, 50f)
        }
        g.at(TextActor(d.desc, 28f, Gfx.SUB), 60f, 1478f, 960f, 44f)
        val cost = game.rules.catLevelCost(lv)
        g.at(NyButton("레벨업", "yellow", sub = "골드 ${fmt(cost)}", onDisabled = { game.toast.show("골드가 부족해요", Gfx.GOLD) }) {
            save.gold -= cost
            save.cats[sel] = lv + 1
            game.persist()
            game.audio.play("equip")
            fx.burst(220f, 1320f, Gfx.GOLD, 30, 800f, 14f, 0.6f)
            fx.stars(220f, 1320f, 10, 500f, 44f, true)
            fx.ring(220f, 1320f, Gfx.GOLD, 250f, 0.5f, 20f)
            game.toast.show("${d.name} Lv.${lv + 1}!", Gfx.GOLD)
            rebuild()
        }.apply { disabled = save.gold < cost }, 60f, 1560f, 470f, 140f)
        val inSquad = sel in save.squad
        g.at(NyButton(if (inSquad) "출전 중" else "출전시키기", if (inSquad) "cream" else "mint") {
            progress.setSquadMember(sel)
            game.persist()
            game.toast.show("${d.name} 출전!")
            rebuild()
        }.apply { disabled = inSquad }, 550f, 1560f, 470f, 140f)
        tabBar(g, "cats")
    }
}

// ======================= 성장 =======================
class GrowthScreen(game: MergeNyangGame) : MenuScreen(game, "workshop") {
    companion object { var tab = "forge" }

    override fun build(g: Group) {
        g.at(DrawActor { Gfx.fullRect(TitleScreen.DIMMER, 0.25f) }, 0f, 0f, Gfx.W, Gfx.H)
        topBar(g)
        val forge = tab == "forge"
        header(g, if (forge) "대장간 성장" else "머지냥이 성장", if (forge) "생산 단계와 에너지를 키워요" else "대장장이 냥이의 솜씨를 키워요")
        g.at(NyButton("대장간", if (forge) "yellow" else "cream", icon = "icons/forge") { tab = "forge"; rebuild() }, 60f, 320f, 470f, 100f)
        g.at(NyButton("머지냥이", if (!forge) "yellow" else "cream", icon = "icons/paw") { tab = "smith"; rebuild() }, 550f, 320f, 470f, 100f)
        val list = if (forge) data.forgeUpgrades else data.smithUpgrades
        val levels = if (forge) save.forge else save.smith
        list.forEachIndexed { i, u ->
            val y = 450f + i * 250f
            val lv = levels[u.id] ?: 0
            val max = lv >= u.max
            val cost = u.cost(lv)
            g.at(PanelActor("ui/panel-cream"), 30f, y, 1020f, 230f)
            g.at(PanelActor("ui/panel-peach"), 60f, y + 30f, 170f, 170f)
            g.at(ImgActor("icons/${u.icon}"), 90f, y + 60f, 110f, 110f)
            g.at(TextActor(u.name, 40f, align = Align.left), 260f, y + 40f, 440f, 50f)
            g.at(TextActor("Lv.$lv / ${u.max}", 30f, Gfx.MUTED, Align.right), 700f, y + 40f, 310f, 50f)
            g.at(TextActor(u.describe(lv), 28f, Gfx.SUB, Align.left), 260f, y + 100f, 440f, 40f)
            if (!max) g.at(TextActor("다음: ${u.describe(lv + 1)}", 26f, Gfx.color("2a9a5aff"), Align.left), 260f, y + 145f, 440f, 40f)
            g.at(DrawActor { Gfx.bar(260f, y + 185f, 400f, 30f, lv / u.max.toFloat(), "ui/progress-gold") }, 260f, y + 185f, 400f, 30f)
            g.at(NyButton(if (max) "최대 레벨" else "강화", "yellow", sub = if (max) null else "골드 ${fmt(cost)}",
                onDisabled = { if (!max) game.toast.show("골드가 부족해요", Gfx.GOLD) }) {
                save.gold -= cost
                levels[u.id] = lv + 1
                game.persist()
                game.audio.play("produce")
                game.audio.play("equip")
                fx.sparks(145f, y + 115f, SPARK, 20, -PI.toFloat() / 2, 3f)
                fx.burst(145f, y + 115f, Gfx.GOLD, 20, 600f, 12f, 0.5f)
                showPopup("upgraded", u.name + " Lv.${lv + 1}" to u.describe(lv + 1))
            }.apply { disabled = max || save.gold < cost }, 700f, y + 105f, 320f, 110f)
        }
        tabBar(g, "lobby")
    }
}

// ======================= 모드 =======================
class ModesScreen(game: MergeNyangGame) : MenuScreen(game, "town") {
    override fun build(g: Group) {
        topBar(g)
        header(g, "모험을 떠나요", "함께 만들고, 함께 지켜요")
        progress.refreshBossTries(game.today)
        val ch = progress.unlockedChapter()
        val wb = data.boss(Waves.worldBossOfWeek(data, game.now))
        data class Card(val img: String, val name: String, val sub: String, val open: Boolean, val online: Boolean, val go: () -> Unit)
        val cards = listOf(
            Card("ui/mode-solo", "개인 디펜스", "${data.chapters[ch].name} ${ch + 1}-${progress.unlockedStage(ch) + 1}", true, false) { game.go<StagesScreen>() },
            Card("ui/mode-tower", "무한의 탑", if (progress.towerOpen()) "최고 ${save.towerBest}층" else "1-5 클리어 시 해금", progress.towerOpen(), false) {
                game.startBattle(BattleSpec(Mode.TOWER, floor = 1))
            },
            Card("ui/mode-boss", "월드보스", if (progress.worldBossOpen()) "${wb.name} · 남은 ${save.bossTries}회" else "1-10 클리어 시 해금", progress.worldBossOpen(), false) {
                game.startBattle(BattleSpec(Mode.WORLD_BOSS))
            },
            Card("ui/mode-coop", "멀티 디펜스", "서버 연동 후 오픈", false, true) {},
            Card("ui/mode-duel", "1:1 대전", "서버 연동 후 오픈", false, true) {},
            Card("ui/mode-team", "팀 대전", "서버 연동 후 오픈", false, true) {},
        )
        cards.forEachIndexed { i, c ->
            val x = 30f + (i % 3) * 345f
            val y = 330f + (i / 3) * 700f
            g.at(PanelActor(if (c.open) "ui/panel-cream" else "ui/panel-lavender"), x, y, 330f, 680f)
            g.at(ImgActor(c.img, tint = if (c.open) Color.WHITE else LOCKED), x + 20f, y + 30f, 290f, 440f)
            if (!c.open) g.at(ImgActor("icons/lock"), x + 105f, y + 190f, 120f, 120f)
            g.at(TextActor(c.name, 40f), x + 20f, y + 485f, 290f, 50f)
            g.at(TextActor(c.sub, 24f, Gfx.SUB), x + 20f, y + 540f, 290f, 40f)
            g.at(NyButton(if (c.open) "입장" else "잠김", if (c.open) "yellow" else "cream", textSize = 32f,
                onDisabled = { game.toast.show(if (c.online) "온라인 모드는 서버 연동 후 열려요" else c.sub) }, onClick = c.go)
                .apply { disabled = !c.open }, x + 40f, y + 590f, 250f, 76f)
        }
        tabBar(g, "modes")
    }

    companion object { val LOCKED = Color(0.7f, 0.68f, 0.72f, 1f) }
}

// ======================= 스테이지 =======================
class StagesScreen(game: MergeNyangGame) : MenuScreen(game, "town") {
    private var ch = -1
    private var prep = -1

    override fun onBack() = game.go<ModesScreen>()

    override fun show() {
        val max = progress.unlockedChapter()
        ch = if (ch < 0) max else minOf(ch, max)
        prep = -1
        super.show()
    }

    override fun build(g: Group) {
        val chap = data.chapters[ch]
        val boss = data.boss(chap.boss)
        topBar(g)
        header(g, "${ch + 1}. ${chap.name}", chap.rule) { game.go<ModesScreen>() }
        val maxCh = progress.unlockedChapter()
        g.at(NyButton("", "cream", icon = "icons/back", iconSize = 50f) { ch--; rebuild() }.apply { disabled = ch <= 0 }, 30f, 320f, 150f, 100f)
        g.at(PanelActor("ui/panel-mint"), 200f, 320f, 680f, 100f)
        g.at(TextActor("챕터 ${ch + 1} · 별 ${progress.chapterStars(ch)} / ${data.stagesPerChapter * 3}", 36f), 200f, 320f, 680f, 100f)
        g.at(NyButton("", if (ch < maxCh) "yellow" else "cream", icon = "icons/play", iconSize = 50f,
            onDisabled = { game.toast.show(if (ch >= data.chapters.size - 1) "마지막 챕터예요" else "이전 챕터 보스를 쓰러뜨리세요") }) { ch++; rebuild() }
            .apply { disabled = ch >= maxCh }, 900f, 320f, 150f, 100f)

        g.at(PanelActor("ui/panel-cream"), 30f, 440f, 1020f, 260f)
        g.at(DrawActor {
            Chars.foe(boss.atkId, (time * 1.5f).toInt() % 2, 180f, 680f, 0.46f)
            chap.enemies.forEachIndexed { i, e -> Chars.foe(data.enemy(e).atkId, 0, 460f + i * 150f, 680f, 0.3f) }
        }, 30f, 440f, 1020f, 260f)
        g.at(TextActor("챕터 보스 · ${boss.name}", 36f, align = Align.left), 340f, 470f, 680f, 50f)
        g.at(TextActor(boss.tip, 26f, Gfx.SUB, Align.left), 340f, 525f, 680f, 40f)
        g.at(TextActor("등장 몬스터", 26f, Gfx.MUTED), 760f, 630f, 240f, 40f)

        val unlocked = progress.unlockedStage(ch)
        for (s in 0 until data.stagesPerChapter) {
            val x = 40f + (s % 4) * 255f
            val y = 725f + (s / 4) * 200f
            val stars = progress.stars(ch, s)
            val open = s <= unlocked
            val isBoss = (s + 1) % 5 == 0
            val cur = s == unlocked && stars == 0
            g.at(NyButton("", if (!open) "cream" else if (isBoss) "peach" else if (cur) "yellow" else "mint", pulse = cur,
                onDisabled = { game.toast.show("이전 스테이지를 먼저 클리어하세요") }) { prep = s; rebuild() }
                .apply { disabled = !open }, x, y, 240f, 180f)
            if (!open) {
                g.at(ImgActor("icons/lock"), x + 85f, y + 45f, 70f, 70f)
                continue
            }
            g.at(TextActor("${ch + 1}-${s + 1}", 44f), x, y + 30f, 240f, 64f)
            if (isBoss) g.at(ImgActor(if (s + 1 == data.stagesPerChapter) "icons/crown" else "icons/rat"), x + 178f, y + 11f, 54f, 54f)
            for (k in 0 until 3) {
                g.at(ImgActor("icons/star", tint = if (k < stars) Color.WHITE else FADED_STAR), x + 50f + k * 48f, y + 96f, 44f, 44f)
            }
        }
        tabBar(g, "modes")
        if (prep >= 0) buildPrep(g, prep)
    }

    private fun buildPrep(g: Group, s: Int) {
        val chap = data.chapters[ch]
        val boss = data.boss(chap.boss)
        g.at(com.mergenyang.game.ui.DimActor(0.6f), 0f, -Gfx.ext, Gfx.W, Gfx.H + Gfx.ext * 2)
        g.at(PanelActor("ui/panel-cream"), 60f, 330f, 960f, 1280f)
        g.at(TextActor("${ch + 1}-${s + 1} 출전 준비", 58f), 60f, 380f, 960f, 80f)
        val isBoss = (s + 1) % 5 == 0
        val desc = when {
            s + 1 == data.stagesPerChapter -> "챕터 보스: ${boss.name}"
            isBoss -> "중간 보스: 부하 ${boss.name}"
            else -> "일반 3웨이브 + 정예 1웨이브"
        }
        g.at(TextActor(desc, 30f, if (isBoss) Gfx.color("c04030ff") else Gfx.SUB), 60f, 460f, 960f, 50f)
        g.at(PanelActor("ui/panel-peach"), 110f, 530f, 860f, 330f)
        g.at(TextActor("등장 몬스터", 30f), 110f, 550f, 860f, 50f)
        g.at(DrawActor {
            chap.enemies.forEachIndexed { i, e -> Chars.foe(data.enemy(e).atkId, 0, 300f + i * 240f, 830f, 0.42f) }
            if (isBoss) Chars.foe(boss.atkId, 0, 810f, 850f, 0.5f)
        }, 110f, 530f, 860f, 330f)
        val rec = chap.recommended
        g.at(TextActor("출전 고양이", 34f, align = Align.left), 140f, 885f, 400f, 50f)
        g.at(TextActor("추천: ${rec.joinToString(" + ") { data.cat(it).name }}", 26f, Gfx.color("2a9a5aff"), Align.right), 480f, 885f, 460f, 50f)
        save.squad.forEachIndexed { i, id ->
            val x = 110f + i * 440f
            g.at(PanelActor(if (id in rec) "ui/panel-mint" else "ui/panel-cream"), x, 950f, 420f, 300f)
            g.at(DrawActor { Chars.idle(id, x + 210f, 1200f, 0.45f, time, phase = i.toFloat()) }, x, 950f, 420f, 300f)
            g.at(TextActor("${data.cat(id).name} Lv.${progress.catLevel(id)}", 28f), x, 1205f, 420f, 44f)
        }
        val stars = progress.stars(ch, s)
        g.at(TextActor(if (stars > 0) "최고 기록 ★$stars" else "첫 클리어 보상: 보석 5", 30f, Gfx.MUTED), 60f, 1265f, 960f, 50f)
        g.at(NyButton("편성 변경", "mint", icon = "icons/cat") { prep = -1; game.go<CatsScreen>() }, 110f, 1330f, 420f, 120f)
        g.at(NyButton("출전!", "yellow", sub = "에너지 ${data.balance.stageEnergyCost}", pulse = true) {
            if (game.startBattle(BattleSpec(Mode.STAGE, ch, s))) prep = -1
        }, 550f, 1330f, 420f, 120f)
        g.at(NyButton("닫기", "cream") { prep = -1; rebuild() }, 340f, 1480f, 400f, 100f)
    }

    companion object { val FADED_STAR = Color(1f, 1f, 1f, 0.25f) }
}

// ======================= 상점 =======================
class ShopScreen(game: MergeNyangGame) : MenuScreen(game, "shop") {
    override fun build(g: Group) {
        topBar(g)
        header(g, "냥냥 상점", "오늘의 작은 선물을 만나보세요")
        g.at(DrawActor { Gfx.fit("bg/shop-merchant", 540f, 552f, 486f, 486f) }, 0f, 300f, Gfx.W, 500f)
        val free = save.dailyChest != game.today
        g.at(PanelActor("ui/panel-cream"), 30f, 720f, 1020f, 190f)
        g.at(ImgActor("icons/chest"), 70f, 750f, 140f, 130f)
        g.at(TextActor("일일 무료 상자", 40f, align = Align.left), 250f, 755f, 500f, 50f)
        g.at(TextActor("매일 골드와 보석을 받아요", 28f, Gfx.SUB, Align.left), 250f, 820f, 500f, 40f)
        g.at(NyButton(if (free) "받기" else "내일 다시", "yellow", pulse = free) {
            val gold = (300..800).random() * (1 + progress.unlockedChapter())
            val gem = (5..20).random()
            save.gold += gold
            save.gems += gem
            save.dailyChest = game.today
            game.persist()
            game.audio.play("chest")
            fx.collect(140f, 815f, "icons/gold", 400f, 56f, 16, true) { game.audio.play("coin") }
            fx.collect(140f, 815f, "icons/gem", 740f, 56f, 8, true) { game.audio.play("coin") }
            game.toast.show("골드 ${fmt(gold)} · 보석 $gem 획득!", Gfx.GOLD)
            rebuild()
        }.apply { disabled = !free }, 780f, 760f, 240f, 110f)

        val mult = 1 + progress.unlockedChapter()
        val items = listOf(
            Triple("icons/energy", "에너지 50", 30) to { save.energy = minOf(99, save.energy + 50) },
            Triple("icons/gold", "골드 ${fmt(2500 * mult)}", 50) to { save.gold += 2500L * mult },
            Triple("icons/gold", "골드 ${fmt(12000 * mult)}", 200) to { save.gold += 12000L * mult },
        )
        val colors = listOf("mint", "peach", "lavender")
        items.forEachIndexed { i, (info, buy) ->
            val (icon, name, price) = info
            val x = 30f + i * 345f
            g.at(PanelActor("ui/panel-${colors[i]}"), x, 940f, 330f, 420f)
            g.at(ImgActor(icon), x + 85f, 990f, 160f, 160f)
            g.at(TextActor(name, 34f), x + 20f, 1175f, 290f, 50f)
            g.at(NyButton("$price", "yellow", icon = "icons/gem", iconSize = 44f, onDisabled = { game.toast.show("보석이 부족해요", Gfx.GOLD) }) {
                save.gems -= price
                buy()
                game.persist()
                game.audio.play("chest")
                fx.burst(x + 165f, 1070f, Gfx.GOLD, 30, 700f, 14f, 0.5f)
                game.toast.show("$name 구매 완료!", Gfx.GOLD)
                rebuild()
            }.apply { disabled = save.gems < price }, x + 30f, 1240f, 270f, 100f)
        }
        g.at(PanelActor("ui/panel-cream"), 30f, 1390f, 1020f, 330f)
        g.at(ImgActor("icons/gem"), 75f, 1425f, 110f, 110f)
        g.at(TextActor("보석 충전 · 시즌 패스 · 스킨", 36f, align = Align.left), 230f, 1425f, 780f, 50f)
        g.at(TextActor("결제는 Google Play Billing 연동 후 제공돼요", 26f, Gfx.SUB, Align.left), 230f, 1485f, 780f, 40f)
        g.at(TextActor("보석은 첫 클리어·별 3개·월드보스로 모을 수 있어요", 26f, Gfx.SUB, Align.left), 70f, 1560f, 940f, 40f)
        g.at(NyButton("패키지 · 광고 제거 (준비 중)", "cream", textSize = 30f, onDisabled = { game.toast.show("출시 버전에서 만나요!") }) {}
            .apply { disabled = true }, 70f, 1615f, 940f, 90f)
        tabBar(g, "shop")
    }
}

// ======================= 랭킹 =======================
class RankingScreen(game: MergeNyangGame) : MenuScreen(game, "town") {
    private var tab = "tower"
    private val npc = listOf("구름냥", "별빛냥", "고등어냥", "초코냥", "치즈냥", "두부냥", "호박냥", "보리냥", "까망냥", "망고냥", "모찌냥", "나비냥")

    override fun build(g: Group) {
        topBar(g)
        header(g, "랭킹", "이 기기 기록 기준 · 온라인 랭킹은 서버 연동 후")
        listOf("tower" to "무한의 탑", "boss" to "월드보스", "power" to "전투력").forEachIndexed { i, (id, label) ->
            g.at(NyButton(label, if (tab == id) "mint" else "cream") { tab = id; rebuild() }, 40f + i * 340f, 320f, 320f, 100f)
        }
        val my = when (tab) {
            "tower" -> save.towerBest.toLong()
            "boss" -> save.bossBest
            else -> progress.power().toLong()
        }
        val base = when (tab) { "tower" -> 60.0; "boss" -> 2_500_000.0; else -> 60_000.0 }
        data class Row(val name: String, val v: Long, val cat: String, val me: Boolean = false)
        val ids = data.catIds
        val list = (npc.mapIndexed { i, n -> Row(n, (base * Math.pow(0.78, i.toDouble())).toLong(), ids[i % ids.size]) } +
            Row("나 (집사)", my, save.squad.first(), true)).sortedByDescending { it.v }
        val unit = when (tab) { "tower" -> "층"; "boss" -> "피해"; else -> "전투력" }
        val podium = listOf(Triple(1, 540f, 700f), Triple(0, 220f, 760f), Triple(2, 860f, 790f))
        for ((i, x, y) in podium) {
            val e = list[i]
            g.at(PanelActor(if (e.me) "ui/panel-mint" else "ui/panel-cream"), x - 140f, y, 280f, 180f)
            g.at(DrawActor { Chars.idle(e.cat, x, y + 10f, 0.42f, time, phase = i.toFloat()) }, x - 140f, y - 240f, 280f, 250f)
            g.at(ImgActor(if (i == 0) "icons/crown" else "icons/trophy"), x - 35f, y - 285f, 70f, 70f)
            g.at(TextActor("${i + 1}위 ${e.name}", 30f), x - 130f, y + 30f, 260f, 50f)
            g.at(TextActor("${shortNum(e.v.toDouble())} $unit", 26f, Gfx.MUTED), x - 130f, y + 95f, 260f, 44f)
        }
        list.drop(3).take(5).forEachIndexed { i, e ->
            val y = 1010f + i * 118f
            g.at(PanelActor(if (e.me) "ui/panel-mint" else "ui/panel-cream"), 40f, y, 1000f, 108f)
            g.at(TextActor("${i + 4}", 40f), 70f, y, 80f, 108f)
            g.at(ImgActor("portraits/cat-${e.cat}"), 165f, y + 11f, 90f, 86f)
            g.at(TextActor(e.name, 34f, align = Align.left), 280f, y, 400f, 108f)
            g.at(TextActor("${fmt(e.v)} $unit", 30f, Gfx.MUTED, Align.right), 600f, y, 400f, 108f)
        }
        val rank = list.indexOfFirst { it.me } + 1
        g.at(PanelActor("ui/panel-peach"), 40f, 1640f, 1000f, 100f)
        g.at(TextActor("내 순위 ${rank}위", 36f, align = Align.left), 90f, 1640f, 400f, 100f)
        g.at(TextActor("${fmt(my)} $unit", 34f, align = Align.right), 600f, 1640f, 400f, 100f)
        tabBar(g, "ranking")
    }
}

