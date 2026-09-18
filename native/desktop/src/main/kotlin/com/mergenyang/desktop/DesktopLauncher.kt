package com.mergenyang.desktop

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.Platform
import com.mergenyang.game.SaveStore
import java.io.File

/** 개발 PC 저장 파일 (native/.desktop-save.json) */
class FileSaveStore(private val file: File) : SaveStore {
    override fun load(): String? = if (file.isFile) file.readText() else null
    override fun save(json: String) {
        file.parentFile?.mkdirs()
        file.writeText(json)
    }
}

/**
 * 사용법 (작업 폴더: native/assets)
 *   gradlew :desktop:run                       일반 실행 (540x960 창)
 *   gradlew :desktop:run --args="--shots DIR"  자동 시나리오로 화면별 스크린샷 저장 후 종료
 */
fun main(args: Array<String>) {
    val shotsDir = args.indexOf("--shots").takeIf { it >= 0 }?.let { File(args[it + 1]) }
    val saveFile = File("..", if (shotsDir != null) ".shots-save.json" else ".desktop-save.json")
    if (shotsDir != null) saveFile.delete()
    val platform = Platform(
        saveStore = FileSaveStore(saveFile),
        debugHook = shotsDir?.let { ShotScript(it, "--smith-only" in args) },
    )
    val config = Lwjgl3ApplicationConfiguration().apply {
        setTitle("머지냥 디펜스 (개발용)")
        val height = args.indexOf("--height").takeIf { it >= 0 }?.let { args[it + 1].toInt() } ?: 960
        val width = args.indexOf("--width").takeIf { it >= 0 }?.let { args[it + 1].toInt() } ?: 540
        setWindowedMode(width, height)
        setForegroundFPS(60)
        useVsync(true)
        setBackBufferConfig(8, 8, 8, 8, 16, 0, 4)
    }
    Lwjgl3Application(MergeNyangGame(platform), config)
}
