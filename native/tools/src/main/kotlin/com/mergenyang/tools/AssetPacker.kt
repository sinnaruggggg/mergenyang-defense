package com.mergenyang.tools

import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.tools.texturepacker.TexturePacker
import java.io.File

/**
 * art/ 원화 → assets/ 텍스처 아틀라스.
 * 인자: <art 폴더> <assets 폴더>
 *
 * - ui: 패널·버튼·게이지·이펙트 (9-slice 가장자리 보존을 위해 원본 배율)
 * - icons, items: 화면에서 작게 쓰므로 0.5배
 * - chars: 대기·공격 프레임 (512 캔버스, 여백 제거 후 오프셋 보존)
 * - portraits: 고양이·보스 전신 원화 0.35배
 * - 배경 4장은 개별 PNG로 복사
 */
fun main(args: Array<String>) {
    val art = File(args.getOrElse(0) { "../art" }).canonicalFile
    val out = File(args.getOrElse(1) { "assets" }).canonicalFile
    val ui = File(art, "raster-ui-v3/assets")
    val anim = File(art, "raster-ui-v3/animations")
    val atk = File(art, "attack-motion-v4/characters")
    val work = File(out.parentFile, "build-assets-src").apply { deleteRecursively(); mkdirs() }

    fun stage(name: String, files: List<Pair<File, String>>): File {
        val dir = File(work, name).apply { mkdirs() }
        files.forEach { (src, dstName) ->
            require(src.isFile) { "원화 없음: $src" }
            src.copyTo(File(dir, "$dstName.png"), overwrite = true)
        }
        return dir
    }

    fun settings(scale: Float, maxSize: Int, strip: Boolean) = TexturePacker.Settings().apply {
        maxWidth = maxSize
        maxHeight = maxSize
        this.scale = floatArrayOf(scale)
        stripWhitespaceX = strip
        stripWhitespaceY = strip
        paddingX = 4
        paddingY = 4
        edgePadding = true
        duplicatePadding = true
        filterMin = Texture.TextureFilter.MipMapLinearLinear
        filterMag = Texture.TextureFilter.Linear
        combineSubdirectories = false
        useIndexes = false
        fast = false
    }

    val atlasDir = File(out, "atlas").apply { mkdirs() }
    fun pack(name: String, dir: File, s: TexturePacker.Settings) {
        File(atlasDir, "$name.atlas").delete()
        atlasDir.listFiles { f -> f.name.startsWith(name) && f.extension == "png" }?.forEach { it.delete() }
        TexturePacker.process(s, dir.path, atlasDir.path, name)
        println("packed $name")
    }

    val uiFiles = File(ui, "ui").listFiles { f -> f.extension == "png" }!!.map { it to it.nameWithoutExtension }
    pack("ui", stage("ui", uiFiles), settings(1f, 4096, false))

    val webAssets = File(art.parentFile, "game/assets")

    val iconFiles = File(ui, "icons").listFiles { f -> f.extension == "png" }!!.map { it to it.nameWithoutExtension }
    val iconsDir = stage("icons", iconFiles)
    // 새 모루 원화 (타이틀·전투 좌하단). 투명 여백을 잘라 fit 박스가 그림에 맞도록 한다
    trimCopy(File(webAssets, "title-empty-anvil.png"), File(iconsDir, "anvil.png"))
    pack("icons", iconsDir, settings(0.5f, 2048, true))

    // items/item-weapon-1-twig.png → weapon-1, 9~16단계는 game/assets/items-extra
    val itemFiles = File(ui, "items").listFiles { f -> f.extension == "png" }!!.map { f ->
        val parts = f.nameWithoutExtension.removePrefix("item-").split("-")
        f to "${parts[0]}-${parts[1]}"
    } + (File(webAssets, "items-extra").listFiles { f -> f.extension == "png" } ?: emptyArray()).map { f ->
        val parts = f.nameWithoutExtension.removePrefix("item-").split("-")
        f to "${parts[0]}-${parts[1]}"
    }
    pack("items", stage("items", itemFiles), settings(0.5f, 4096, true))

    // 새 대장간 UI (패널·버튼 이미지)
    val lobbyFiles = listOf("reward", "level", "gold", "mint", "adventure").map { File(webAssets, "workshop-ui/$it.png") to it }
    pack("lobby", stage("lobby", lobbyFiles), settings(0.6f, 2048, false))

    val portraitFiles = File(ui, "characters").listFiles { f -> f.extension == "png" }!!.map { it to it.nameWithoutExtension }
    pack("portraits", stage("portraits", portraitFiles), settings(0.35f, 2048, true))

    // 캐릭터 프레임: idle/<id>-0, atk/<atkId>-0 … 여백 제거(오프셋은 아틀라스에 기록됨)
    val charFiles = ArrayList<Pair<File, String>>()
    anim.listFiles { f -> f.isDirectory }!!.forEach { d ->
        listOf("idle-0", "idle-1").forEach { charFiles += File(d, "$it.png") to "idle_${d.name}_${it.last()}" }
    }
    atk.listFiles { f -> f.isDirectory }!!.forEach { d ->
        listOf(0, 1).forEach { charFiles += File(d, "attack-$it.png") to "atk_${d.name}_$it" }
    }
    // 걷기 2프레임 (같은 그림을 위로 3px 옮긴 프레임)
    File(webAssets, "walk").listFiles { f -> f.name.endsWith("-walk-0.png") || f.name.endsWith("-walk-1.png") }?.forEach { f ->
        val id = f.nameWithoutExtension.substringBeforeLast("-walk-")
        val frame = f.nameWithoutExtension.last()
        charFiles += f to "walk_${id}_$frame"
    }
    pack("chars", stage("chars", charFiles), settings(1f, 4096, true))

    val bgOut = File(out, "backgrounds").apply { mkdirs() }
    File(ui, "backgrounds").listFiles { f -> f.extension == "png" }!!.forEach { it.copyTo(File(bgOut, it.name), overwrite = true) }
    // 새 대장간 배경과 대장장이 반신 그림은 크기가 커서 개별 텍스처로
    File(webAssets, "workshop-ui/main-background.png").copyTo(File(bgOut, "lobby-room.png"), overwrite = true)
    File(webAssets, "workshop-ui/smith-game-waist-up.png").copyTo(File(bgOut, "lobby-smith.png"), overwrite = true)
    File(webAssets, "shop-merchant.png").copyTo(File(bgOut, "shop-merchant.png"), overwrite = true)

    work.deleteRecursively()
    makeLauncherIcons(ui, File(out.parentFile, "android/src/main/res"))
    println("done → $out")
}

/** 런처 아이콘: 원화 크림 패널 위에 전사냥이 초상화를 합성 */
private fun makeLauncherIcons(ui: File, res: File) {
    val panel = javax.imageio.ImageIO.read(File(ui, "ui/panel-cream.png"))
    val cat = javax.imageio.ImageIO.read(File(ui, "characters/cat-warrior.png"))
    val sizes = mapOf("mdpi" to 48, "hdpi" to 72, "xhdpi" to 96, "xxhdpi" to 144, "xxxhdpi" to 192)
    for ((density, size) in sizes) {
        val img = java.awt.image.BufferedImage(size, size, java.awt.image.BufferedImage.TYPE_INT_ARGB)
        val g = img.createGraphics()
        g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC)
        g.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_QUALITY)
        g.drawImage(panel, 0, 0, size, size, null)
        // 초상화 윗부분(얼굴)을 크게
        val crop = cat.getSubimage(cat.width / 8, 0, cat.width * 3 / 4, cat.height * 3 / 4)
        val pad = size / 10
        g.drawImage(crop, pad, pad, size - pad * 2, size - pad * 2, null)
        g.dispose()
        val dir = File(res, "mipmap-$density").apply { mkdirs() }
        javax.imageio.ImageIO.write(img, "png", File(dir, "ic_launcher.png"))
    }
    println("launcher icons → $res")
}

/** 투명 여백을 잘라 복사한다 (원본 캔버스가 커도 fit 박스에 꽉 차게) */
private fun trimCopy(src: File, dst: File) {
    require(src.isFile) { "원화 없음: $src" }
    val img = javax.imageio.ImageIO.read(src)
    var minX = img.width
    var minY = img.height
    var maxX = -1
    var maxY = -1
    for (y in 0 until img.height) for (x in 0 until img.width) {
        if ((img.getRGB(x, y) ushr 24) > 8) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
        }
    }
    if (maxX < 0) {
        src.copyTo(dst, overwrite = true)
        return
    }
    javax.imageio.ImageIO.write(img.getSubimage(minX, minY, maxX - minX + 1, maxY - minY + 1), "png", dst)
}
