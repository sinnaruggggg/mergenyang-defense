package com.mergenyang.game

/** 저장소: Android는 DataStore, 데스크톱은 파일 */
interface SaveStore {
    fun load(): String?
    fun save(json: String)
}

/**
 * 결제·광고·로그인 연동 지점 (Google Play Billing, AdMob, Play Games Services).
 * 스토어 계정·광고 단위 ID가 준비되면 android 모듈에서 실제 구현으로 교체한다.
 */
interface PlatformServices {
    val name: String
    fun signIn(onResult: (Boolean) -> Unit) = onResult(false)
    fun showRewardedAd(placement: String, onReward: () -> Unit) = Unit
    fun purchase(productId: String, onResult: (Boolean) -> Unit) = onResult(false)
    fun vibrate(millis: Int) = Unit
}

object OfflineServices : PlatformServices {
    override val name = "offline"
}

class Platform(
    val saveStore: SaveStore,
    val services: PlatformServices = OfflineServices,
    /** 개발용 자동 스크린샷 등 추가 동작 */
    val debugHook: DebugHook? = null,
)

interface DebugHook {
    fun onCreate(game: MergeNyangGame) = Unit
    fun afterRender(game: MergeNyangGame, delta: Float) = Unit
}
