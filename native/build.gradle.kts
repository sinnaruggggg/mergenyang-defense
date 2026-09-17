plugins {
    id("com.android.application") version "8.13.2" apply false
    kotlin("jvm") version "2.2.21" apply false
    kotlin("android") version "2.2.21" apply false
    kotlin("plugin.serialization") version "2.2.21" apply false
}

// 프로젝트 경로에 한글이 있으면 Windows에서 테스트 실행기·aapt2가 클래스패스를 못 읽는다.
// 이 경우 빌드 결과물만 영문 경로(Gradle 홈, 없으면 임시 폴더) 아래로 옮긴다.
fun File.isAscii() = absolutePath.all { it.code < 128 }

if (!rootDir.isAscii()) {
    val home = gradle.gradleUserHomeDir
    val base = if (home.isAscii()) home else File(System.getProperty("java.io.tmpdir"), "gradle-builds")
    val buildRoot = File(base, "project-builds/${rootProject.name}")
    allprojects {
        layout.buildDirectory.set(File(buildRoot, if (this == rootProject) "_root" else name))
    }
}
