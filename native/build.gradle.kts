plugins {
    id("com.android.application") version "8.13.2" apply false
    kotlin("jvm") version "2.2.21" apply false
    kotlin("android") version "2.2.21" apply false
    kotlin("plugin.serialization") version "2.2.21" apply false
}

// 프로젝트 경로에 한글이 있으면 Windows에서 테스트 실행기·aapt2가 클래스패스를 못 읽는다.
// 이 경우 빌드 결과물만 Gradle 홈(영문 경로) 아래로 옮긴다.
val nonAsciiPath = rootDir.absolutePath.any { it.code > 127 }
if (nonAsciiPath) {
    val buildRoot = File(gradle.gradleUserHomeDir, "project-builds/${rootProject.name}")
    allprojects {
        layout.buildDirectory.set(File(buildRoot, if (this == rootProject) "_root" else name))
    }
}
