package com.mergenyang.game

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Net
import com.badlogic.gdx.net.HttpRequestBuilder
import com.badlogic.gdx.utils.JsonReader

/**
 * GitHub Releases에서 최신 버전을 확인한다.
 * 스토어를 거치지 않는 APK는 자동 갱신이 없으므로, 새 버전이 있으면 로비에서 한 번 알려 준다.
 */
object UpdateCheck {
    data class Release(val version: String, val url: String)

    /** 확인이 끝나고 새 버전이 있을 때만 채워진다 */
    var latest: Release? = null
        private set

    /** 이번 실행에서 이미 알렸는지 */
    var notified = false

    private var started = false

    fun start(repo: String, current: String) {
        if (started || current.isBlank() || current == "dev") return
        started = true
        val request = HttpRequestBuilder()
            .newRequest()
            .method(Net.HttpMethods.GET)
            .url("https://api.github.com/repos/$repo/releases/latest")
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "MergeNyangDefense/$current")
            .timeout(8000)
            .build()
        Gdx.net.sendHttpRequest(request, object : Net.HttpResponseListener {
            override fun handleHttpResponse(response: Net.HttpResponse) {
                runCatching {
                    val json = JsonReader().parse(response.resultAsString)
                    val tag = json.getString("tag_name", "").removePrefix("v")
                    val url = json.getString("html_url", "https://github.com/$repo/releases/latest")
                    if (isNewer(tag, current)) Gdx.app.postRunnable { latest = Release(tag, url) }
                }
            }

            override fun failed(t: Throwable) = Unit
            override fun cancelled() = Unit
        })
    }

    /** 0.2.10 > 0.2.9 처럼 자리별 숫자로 비교한다 */
    fun isNewer(candidate: String, current: String): Boolean {
        if (candidate.isBlank()) return false
        val a = parts(candidate)
        val b = parts(current)
        for (i in 0 until maxOf(a.size, b.size)) {
            val x = a.getOrElse(i) { 0 }
            val y = b.getOrElse(i) { 0 }
            if (x != y) return x > y
        }
        return false
    }

    private fun parts(v: String) = v.trim().removePrefix("v").split('.', '-')
        .map { it.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }

    fun open(url: String) = runCatching { Gdx.net.openURI(url) }
}
