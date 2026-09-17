// 게임 규칙·전투 계산·데이터 모델 (서버와 공유 가능한 순수 Kotlin)
plugins {
    kotlin("jvm")
    kotlin("plugin.serialization")
}

val serializationVersion: String by project

kotlin { jvmToolchain(17) }

dependencies {
    api("org.jetbrains.kotlinx:kotlinx-serialization-json:$serializationVersion")
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
    // 테스트는 실제 데이터 테이블(assets/data/gamedata.json)을 읽는다
    systemProperty("assetsDir", rootProject.file("assets").absolutePath)
}
