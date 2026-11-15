package com.diyardesk.tablet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class ThemeStoreTest {

    @get:Rule
    val tmp = TemporaryFolder()

    @Test
    fun persistsThemeParamsLanguageAndVirtualBar() {
        val dir = tmp.newFolder("store")
        val s1 = ThemeStore(dir)
        s1.setActiveTheme("istanbul")
        s1.setParam("istanbul", "lanternWarmth", 0.85)
        s1.setLanguage("en")
        s1.setVirtualBarModeValue("on")

        val s2 = ThemeStore(dir)
        assertEquals("istanbul", s2.activeTheme)
        assertEquals("en", s2.lang)
        assertEquals("on", s2.virtualBarMode)
        assertEquals(0.85, s2.getParamsCopy("istanbul").getDouble("lanternWarmth"), 0.001)

        s2.resetThemeParams("istanbul")
        val s3 = ThemeStore(dir)
        assertTrue(!s3.getParamsCopy("istanbul").has("lanternWarmth"))
    }

    @Test
    fun buildsIconsPhysicalRectsAndInitPayload() {
        val dir = tmp.newFolder("store2")
        val s = ThemeStore(dir)
        val customBoxes = listOf(
            NormalizedBox.clamped(0.10f, 0.20f, 0.30f, 0.40f, isWidget = true)
        )
        s.setIconBoxes(customBoxes)

        val msg = s.buildIconsMessage(2560, 1600)
        assertEquals("icons", msg.getString("t"))
        assertTrue(msg.getBoolean("vis"))
        val rect = msg.getJSONArray("r").getJSONArray(0)
        assertEquals(256, rect.getInt(0))
        assertEquals(320, rect.getInt(1))
        assertEquals(768, rect.getInt(2))
        assertEquals(640, rect.getInt(3))

        val init = s.buildInitMessage(2560, 1600, "en")
        assertEquals("init", init.getString("t"))
        assertEquals("en", init.getString("langEff"))
    }
}
