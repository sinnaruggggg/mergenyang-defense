import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    kotlin("android")
}

val gdxVersion: String by project
val datastoreVersion: String by project
val coroutinesVersion: String by project

android {
    namespace = "com.mergenyang.defense"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.mergenyang.defense"
        minSdk = 26
        targetSdk = 36
        // GitHub Actions 릴리즈에서는 태그(v1.2.3)와 실행 번호로 버전을 정한다
        versionCode = System.getenv("VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = System.getenv("VERSION_NAME") ?: "0.1.0"
    }

    signingConfigs {
        // 프로젝트 공용 테스트 키: 어느 PC·CI에서 빌드해도 같은 서명이라 기존 설치 위에 업데이트된다
        getByName("debug") {
            storeFile = file("project-debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        // 스토어 출시 키: GitHub Secrets(RELEASE_KEYSTORE_BASE64 등)가 있을 때만 사용
        val releaseStore = System.getenv("RELEASE_KEYSTORE_PATH")
        if (releaseStore != null) {
            create("release") {
                storeFile = file(releaseStore)
                storePassword = System.getenv("RELEASE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("RELEASE_KEY_ALIAS")
                keyPassword = System.getenv("RELEASE_KEY_PASSWORD")
            }
        }
    }

    sourceSets["main"].apply {
        assets.srcDirs(rootProject.file("assets"))
        jniLibs.srcDirs("libs")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // 출시 키가 없으면 공용 테스트 키로 서명해 설치 테스트가 가능하도록 한다
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    androidResources {
        // 아틀라스·폰트는 압축하지 않아야 로딩이 빠르다
        noCompress += listOf("png", "ttf", "atlas", "ogg", "wav")
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

val natives: Configuration by configurations.creating

dependencies {
    implementation(project(":game"))
    implementation("com.badlogicgames.gdx:gdx-backend-android:$gdxVersion")
    implementation("androidx.datastore:datastore-preferences:$datastoreVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutinesVersion")

    for (abi in listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")) {
        natives("com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-$abi")
        natives("com.badlogicgames.gdx:gdx-freetype-platform:$gdxVersion:natives-$abi")
    }
}

// libGDX 네이티브 .so를 libs/<abi>로 풀어 APK에 포함
val copyAndroidNatives by tasks.registering {
    val jars = natives
    val libsDir = file("libs")
    inputs.files(jars)
    outputs.dir(libsDir)
    doFirst {
        jars.files.forEach { jar ->
            val abi = jar.name.substringAfterLast("natives-").substringBefore(".jar")
            val out = File(libsDir, abi)
            out.mkdirs()
            project.copy {
                from(project.zipTree(jar))
                into(out)
                include("*.so")
            }
        }
    }
}

tasks.matching { it.name.contains("merge") && it.name.contains("JniLibFolders") }.configureEach {
    dependsOn(copyAndroidNatives)
}
