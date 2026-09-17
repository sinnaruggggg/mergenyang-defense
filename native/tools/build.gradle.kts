// 에셋 파이프라인: art/ 원화 → assets/ 텍스처 아틀라스 (TexturePacker)
plugins {
    kotlin("jvm")
    application
}

val gdxVersion: String by project

kotlin { jvmToolchain(17) }

dependencies {
    implementation("com.badlogicgames.gdx:gdx-tools:$gdxVersion")
}

application {
    mainClass.set("com.mergenyang.tools.AssetPackerKt")
}

tasks.named<JavaExec>("run") {
    workingDir = rootProject.projectDir
    args(rootProject.file("../art").absolutePath, rootProject.file("assets").absolutePath)
}
