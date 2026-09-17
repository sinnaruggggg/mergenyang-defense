// 개발용 PC 실행기: 화면 확인, 자동 스크린샷, 밸런스 시뮬레이션
plugins {
    kotlin("jvm")
    application
}

val gdxVersion: String by project

kotlin { jvmToolchain(17) }

dependencies {
    implementation(project(":game"))
    implementation("com.badlogicgames.gdx:gdx-backend-lwjgl3:$gdxVersion")
    implementation("com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-desktop")
    implementation("com.badlogicgames.gdx:gdx-freetype-platform:$gdxVersion:natives-desktop")
}

application {
    mainClass.set("com.mergenyang.desktop.DesktopLauncherKt")
}

tasks.named<JavaExec>("run") {
    workingDir = rootProject.file("assets")
    isIgnoreExitValue = false
}
