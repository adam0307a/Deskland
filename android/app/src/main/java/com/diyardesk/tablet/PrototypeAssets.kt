package com.diyardesk.tablet

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.FileInputStream
import java.io.InputStream

/**
 * Serves synced `assets/prototype/`, dynamic merged `/themes.json`, and imported `/__custom/...`
 * over `https://appassets.androidplatform.net/` cleanly without `file://` CORS issues.
 */
object PrototypeAssets {

    const val ORIGIN = "https://appassets.androidplatform.net"

    /** Installed before any HTML `<script>` runs so `window.chrome.webview` works identically to Windows/Linux hosts. */
    val WEBVIEW_BRIDGE_JS = """
        (function() {
          if (window.__diyarBridgeReady) return;
          window.__diyarBridgeReady = true;
          const listeners = new Set();
          const pending = [];
          window.__diyarDispatch = function(raw) {
            const evt = { data: typeof raw === 'string' ? raw : JSON.stringify(raw) };
            for (const fn of Array.from(listeners)) {
              try { fn(evt); } catch (e) { console.error('[DiyarDesk bridge]', e); }
            }
          };
          const webviewApi = {
            postMessage(msg) {
              if (window.DiyarNative && typeof window.DiyarNative.post === 'function') {
                window.DiyarNative.post(typeof msg === 'string' ? msg : JSON.stringify(msg));
              } else {
                pending.push(msg);
              }
            },
            addEventListener(type, fn) {
              if (type === 'message' && typeof fn === 'function') listeners.add(fn);
            },
            removeEventListener(type, fn) {
              if (type === 'message') listeners.delete(fn);
            }
          };
          window.chrome = window.chrome || {};
          window.chrome.webview = webviewApi;
          window.__diyarFlushPending = function() {
            while (pending.length && window.DiyarNative) {
              const m = pending.shift();
              webviewApi.postMessage(m);
            }
          };
        })();
    """.trimIndent()

    fun createAssetLoader(context: Context, importer: CustomThemeImporter): WebViewAssetLoader {
        val assetManager = context.assets
        val rootHandler = WebViewAssetLoader.PathHandler { path ->
            val clean = path.trimStart('/').ifEmpty { "settings.html" }
            if (clean == "themes.json") {
                return@PathHandler try {
                    val base = assetManager.open("prototype/themes.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
                    val merged = importer.mergedThemesJson(base).toByteArray(Charsets.UTF_8)
                    WebResourceResponse("application/json", "utf-8", ByteArrayInputStream(merged))
                } catch (_: Exception) {
                    null
                }
            }
            if (clean.startsWith("__custom/")) {
                val rel = clean.removePrefix("__custom/")
                val target = importer.resolveCustomAsset(rel) ?: return@PathHandler null
                if (!target.isFile) return@PathHandler null
                return@PathHandler try {
                    val mime = CustomThemeImporter.guessMimeType(target.name)
                    WebResourceResponse(mime.substringBefore(';'), "utf-8", FileInputStream(target))
                } catch (_: Exception) {
                    null
                }
            }
            if (clean.contains("..")) return@PathHandler null
            return@PathHandler try {
                val stream: InputStream = assetManager.open("prototype/$clean")
                val mime = CustomThemeImporter.guessMimeType(clean)
                WebResourceResponse(mime.substringBefore(';'), "utf-8", stream)
            } catch (_: Exception) {
                null
            }
        }

        return WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", rootHandler)
            .build()
    }

    fun installBridge(webView: WebView) {
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, WEBVIEW_BRIDGE_JS, setOf("*"))
        }
    }

    fun dispatchMessage(webView: WebView, payload: JSONObject) {
        val quoted = JSONObject.quote(payload.toString())
        webView.evaluateJavascript("window.__diyarDispatch && window.__diyarDispatch($quoted);", null)
    }

    fun themeUrl(page: String, params: String = "wallpaper=1"): String {
        val clean = page.trimStart('/')
        val sep = if ('?' in clean) '&' else '?'
        return "$ORIGIN/$clean$sep$params"
    }

    fun resolvePageFromThemes(context: Context, importer: CustomThemeImporter, themeId: String): String {
        val base = context.assets.open("prototype/themes.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
        val merged = JSONObject(importer.mergedThemesJson(base))
        val arr = merged.optJSONArray("themes") ?: return "flat.html"
        for (i in 0 until arr.length()) {
            val obj = arr.optJSONObject(i) ?: continue
            if (obj.optString("id") == themeId) {
                return obj.optString("page", "flat.html")
            }
        }
        return "flat.html"
    }

    fun isLocalAppUrl(uri: Uri?): Boolean = uri?.host == "appassets.androidplatform.net"
}
