package com.mergenyang.core

/** Each successful production gets one visible impact; repeated taps never reset wind-up. */
class SmithMotion {
    var striking = false
        private set
    var pending = 0
        private set
    private var remaining = 0f

    fun request(): Boolean {
        if (!striking && remaining <= 0f && pending == 0) {
            striking = true
            remaining = 0.10f
            return true
        }
        pending++
        remaining = minOf(remaining, 0.025f)
        return false
    }

    fun update(dt: Float): Boolean {
        if (remaining <= 0f && pending == 0) return false
        remaining -= dt
        if (remaining > 0f) return false
        // Advance at most one phase per render, so both frames can actually be seen.
        if (striking) {
            striking = false
            remaining = if (pending > 0) 0.025f else 0f
            return false
        }
        if (pending > 0) {
            pending--
            striking = true
            remaining = if (pending > 0) 0.025f else 0.10f
            return true
        }
        return false
    }
}
