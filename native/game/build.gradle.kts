// libGDX 화면, 연출, 입력 (Android·데스크톱 공용)
plugins {
    kotlin("jvm")
}

val gdxVersion: String by project
val ktxVersion: String by project
val fleksVersion: String by project

kotlin { jvmToolchain(17) }

dependencies {
    api(project(":core"))
    api("com.badlogicgames.gdx:gdx:$gdxVersion")
    api("com.badlogicgames.gdx:gdx-freetype:$gdxVersion")
    api("io.github.libktx:ktx-app:$ktxVersion")
    api("io.github.libktx:ktx-assets:$ktxVersion")
    api("io.github.libktx:ktx-graphics:$ktxVersion")
    api("io.github.libktx:ktx-actors:$ktxVersion")
    api("io.github.libktx:ktx-scene2d:$ktxVersion")
    api("io.github.libktx:ktx-collections:$ktxVersion")
    api("io.github.quillraven.fleks:Fleks:$fleksVersion")
}
