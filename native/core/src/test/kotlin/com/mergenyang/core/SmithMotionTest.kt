package com.mergenyang.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFalse

class SmithMotionTest {
    @Test fun firstProductionStrikesImmediately() {
        val m = SmithMotion()
        assertTrue(m.request())
        assertTrue(m.striking)
        m.update(0.11f)
        assertFalse(m.striking)
    }
    @Test fun rapidTapsProduceEveryImpactAndRecoverBetweenThem() {
        val m = SmithMotion()
        var impacts = 0
        repeat(12) {
            if (m.request()) impacts++
            repeat(3) { if (m.update(1f / 60)) impacts++ }
        }
        repeat(120) { if (m.update(1f / 60)) impacts++ }
        assertEquals(12, impacts)
        assertEquals(0, m.pending)
        assertFalse(m.striking)
    }
    @Test fun slowFrameDoesNotSkipVisibleRaisedPose() {
        val m = SmithMotion()
        m.request(); m.request()
        assertFalse(m.update(1f))
        assertFalse(m.striking)
        assertTrue(m.update(1f))
    }
}
