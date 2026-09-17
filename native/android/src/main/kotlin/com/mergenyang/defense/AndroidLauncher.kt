package com.mergenyang.defense

import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.badlogic.gdx.backends.android.AndroidApplication
import com.badlogic.gdx.backends.android.AndroidApplicationConfiguration
import com.mergenyang.game.MergeNyangGame
import com.mergenyang.game.Platform
import com.mergenyang.game.PlatformServices
import com.mergenyang.game.SaveStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

private val Context.saveStore by preferencesDataStore(name = "mergenyang_save")
private val SAVE_KEY = stringPreferencesKey("save_json")

/** Jetpack DataStore 저장: 쓰기는 백그라운드에서 최신 값만 반영 */
class DataStoreSave(private val context: Context) : SaveStore {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val queue = Channel<String>(Channel.CONFLATED)

    init {
        scope.launch {
            for (json in queue) context.saveStore.edit { it[SAVE_KEY] = json }
        }
    }

    override fun load(): String? = runBlocking(Dispatchers.IO) { context.saveStore.data.first()[SAVE_KEY] }

    override fun save(json: String) {
        queue.trySend(json)
    }
}

/**
 * 결제(Play Billing)·광고(AdMob)·로그인(Play Games) 연동 자리.
 * 스토어 계정과 광고 단위 ID가 준비되면 여기에 실제 SDK 호출을 넣는다.
 */
class AndroidServices(private val context: Context) : PlatformServices {
    override val name = "android"

    override fun vibrate(millis: Int) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        if (vibrator.hasVibrator()) vibrator.vibrate(VibrationEffect.createOneShot(millis.toLong(), VibrationEffect.DEFAULT_AMPLITUDE))
    }
}

class AndroidLauncher : AndroidApplication() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val config = AndroidApplicationConfiguration().apply {
            useImmersiveMode = true
            useAccelerometer = false
            useCompass = false
            a = 8
            numSamples = 2
        }
        val platform = Platform(saveStore = DataStoreSave(applicationContext), services = AndroidServices(applicationContext))
        initialize(MergeNyangGame(platform), config)
    }
}
