package com.diyardesk.tablet

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.Locale
import java.util.UUID
import java.util.zip.ZipInputStream

/**
 * Custom theme validator, package importer and merged themes.json builder for Android.
 * Mirrors desktop `linux/deskland_linux/importer.py` & Windows `WebCustomHelper`.
 */
class CustomThemeImporter(private val customThemesRoot: File) {

    private val registryFile = File(customThemesRoot, "registry.json")

    init {
        customThemesRoot.mkdirs()
    }

    fun loadCustomThemes(): List<JSONObject> {
        if (!registryFile.exists()) return emptyList()
        return try {
            val arr = JSONArray(registryFile.readText(Charsets.UTF_8))
            buildList {
                for (i in 0 until arr.length()) {
                    arr.optJSONObject(i)?.let { add(it) }
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveCustomThemes(entries: List<JSONObject>) {
        customThemesRoot.mkdirs()
        val arr = JSONArray()
        for (e in entries) arr.put(e)
        registryFile.writeText(arr.toString(2), Charsets.UTF_8)
    }

    fun mergedThemesJson(builtInThemesJson: String): String {
        val root = JSONObject(builtInThemesJson)
        val themes = root.optJSONArray("themes") ?: JSONArray()
        for (custom in loadCustomThemes()) {
            themes.put(custom)
        }
        root.put("themes", themes)
        return root.toString()
    }

    fun importStream(input: InputStream, originalFileName: String): JSONObject {
        val cleanName = originalFileName.substringAfterLast('/').substringAfterLast('\\').ifBlank { "theme.zip" }
        val ext = cleanName.substringAfterLast('.', "").lowercase(Locale.US)
        val baseTitle = cleanName.substringBeforeLast('.').ifBlank { "Custom Theme" }
        val id = "custom-${slugify(baseTitle).take(24)}-${UUID.randomUUID().toString().take(8)}"
        val destDir = File(customThemesRoot, id)
        if (!destDir.mkdirs() && !destDir.isDirectory) {
            throw IllegalStateException("Cannot create theme directory")
        }

        try {
            val entry = when (ext) {
                "zip", "deskland" -> importZipPackage(input, destDir, id, baseTitle)
                "html", "htm" -> importSingleHtml(input, destDir, id, baseTitle)
                in IMAGE_EXTS -> importImageWallpaper(input, cleanName, destDir, id, baseTitle)
                in VIDEO_EXTS -> importVideoWallpaper(input, cleanName, destDir, id, baseTitle)
                else -> throw IllegalArgumentException("Unsupported format: .$ext (supported: .zip, .deskland, .html, images, videos)")
            }
            val current = loadCustomThemes().toMutableList()
            current.add(entry)
            saveCustomThemes(current)
            return entry
        } catch (t: Throwable) {
            destDir.deleteRecursively()
            throw t
        }
    }

    fun removeTheme(themeId: String): Boolean {
        if (!themeId.startsWith("custom-")) return false
        val current = loadCustomThemes()
        val filtered = current.filterNot { it.optString("id") == themeId }
        if (filtered.size == current.size) return false
        saveCustomThemes(filtered)
        val targetDir = resolveCustomAsset(themeId)
        if (targetDir != null && targetDir.exists()) {
            targetDir.deleteRecursively()
        }
        return true
    }

    fun resolveCustomAsset(subPath: String): File? {
        val trimmed = subPath.trimStart('/')
        if (trimmed.isEmpty()) return null
        val rootCanonical = customThemesRoot.canonicalFile
        val target = File(rootCanonical, trimmed).canonicalFile
        val rootPrefix = rootCanonical.path + File.separator
        return if (target == rootCanonical || target.path.startsWith(rootPrefix)) target else null
    }

    private fun importZipPackage(input: InputStream, destDir: File, id: String, fallbackName: String): JSONObject {
        var totalBytes = 0L
        var fileCount = 0
        val buffer = ByteArray(16384)
        val destCanonical = destDir.canonicalFile
        val destPrefix = destCanonical.path + File.separator

        ZipInputStream(BufferedInputStream(input)).use { zis ->
            while (true) {
                val ze = zis.nextEntry ?: break
                val rawName = ze.name.replace('\\', '/')
                if (rawName.startsWith("/") || rawName.contains("..") || rawName.startsWith("./..")) {
                    throw IllegalArgumentException("Unsafe archive path: ${ze.name}")
                }
                val cleanRel = rawName.trimStart('/')
                if (cleanRel.isEmpty()) {
                    zis.closeEntry()
                    continue
                }
                fileCount++
                if (fileCount > MAX_ARCHIVE_FILES) {
                    throw IllegalArgumentException("Archive exceeds maximum $MAX_ARCHIVE_FILES files")
                }

                val outFile = File(destCanonical, cleanRel).canonicalFile
                if (!outFile.path.startsWith(destPrefix) && outFile != destCanonical) {
                    throw IllegalArgumentException("Zip-slip traversal detected: ${ze.name}")
                }

                if (ze.isDirectory) {
                    outFile.mkdirs()
                } else {
                    outFile.parentFile?.mkdirs()
                    FileOutputStream(outFile).use { fos ->
                        while (true) {
                            val n = zis.read(buffer)
                            if (n <= 0) break
                            totalBytes += n
                            if (totalBytes > MAX_ARCHIVE_BYTES) {
                                throw IllegalArgumentException("Archive exceeds 150 MB limit")
                            }
                            fos.write(buffer, 0, n)
                        }
                    }
                }
                zis.closeEntry()
            }
        }

        // Flatten single wrapping directory if present
        val children = destDir.listFiles()?.filter { it.name != "__MACOSX" } ?: emptyList()
        if (children.size == 1 && children[0].isDirectory) {
            val wrapper = children[0]
            wrapper.listFiles()?.forEach { inner ->
                inner.renameTo(File(destDir, inner.name))
            }
            wrapper.deleteRecursively()
        }

        val manifestFile = listOf("manifest.json", "theme.json").map { File(destDir, it) }.firstOrNull { it.isFile }
        val manifest = manifestFile?.let {
            try { JSONObject(it.readText(Charsets.UTF_8)) } catch (_: Exception) { null }
        }

        val requestedEntry = manifest?.optString("entry")?.ifBlank { null }
            ?: manifest?.optString("page")?.ifBlank { null }
        val entryRel = if (requestedEntry != null && File(destDir, requestedEntry).isFile) {
            requestedEntry.trimStart('/')
        } else {
            val idx = File(destDir, "index.html")
            if (idx.isFile) {
                "index.html"
            } else {
                val firstHtml = destDir.walkTopDown()
                    .filter { it.isFile && (it.extension.equals("html", true) || it.extension.equals("htm", true)) }
                    .firstOrNull()
                    ?: throw IllegalArgumentException("Archive contains no HTML entry page")
                firstHtml.relativeTo(destDir).path.replace(File.separatorChar, '/')
            }
        }

        val name = manifest?.optString("name")?.ifBlank { null }
            ?: extractHtmlTitle(File(destDir, entryRel))
            ?: fallbackName
        val desc = manifest?.optString("desc")?.ifBlank { null } ?: "Imported HTML/Canvas theme"
        val adaptive = manifest?.optBoolean("adaptive", true) ?: true
        val groups = manifest?.optJSONArray("groups") ?: JSONArray()

        return buildEntry(
            id = id,
            name = name,
            desc = desc,
            page = "__custom/$id/$entryRel",
            adaptive = adaptive,
            groups = groups
        )
    }

    private fun importSingleHtml(input: InputStream, destDir: File, id: String, fallbackName: String): JSONObject {
        val outFile = File(destDir, "index.html")
        copyLimited(input, outFile, MAX_ARCHIVE_BYTES)
        val title = extractHtmlTitle(outFile) ?: fallbackName
        return buildEntry(
            id = id,
            name = title,
            desc = "Imported HTML wallpaper",
            page = "__custom/$id/index.html",
            adaptive = true,
            groups = JSONArray()
        )
    }

    private fun importImageWallpaper(
        input: InputStream,
        cleanName: String,
        destDir: File,
        id: String,
        fallbackName: String
    ): JSONObject {
        val ext = cleanName.substringAfterLast('.', "png").lowercase(Locale.US)
        val mediaFile = File(destDir, "media.$ext")
        copyLimited(input, mediaFile, MAX_ARCHIVE_BYTES)
        File(destDir, "index.html").writeText(buildImageWrapperHtml("media.$ext", fallbackName), Charsets.UTF_8)
        val groups = JSONArray().apply {
            put(JSONObject().apply {
                put("name", "Image")
                put("items", JSONArray().apply {
                    put(slider("brightness", "Brightness", 0.25, 1.35, 0.05, 1.0))
                    put(slider("motion", "Ambient Drift", 0.0, 1.0, 0.05, 0.35))
                    put(slider("dimIcons", "Dim Under Icons", 0.0, 0.6, 0.05, 0.15))
                })
            })
        }
        return buildEntry(
            id = id,
            name = fallbackName,
            desc = "Imported image wallpaper",
            page = "__custom/$id/index.html",
            adaptive = true,
            groups = groups
        )
    }

    private fun importVideoWallpaper(
        input: InputStream,
        cleanName: String,
        destDir: File,
        id: String,
        fallbackName: String
    ): JSONObject {
        val ext = cleanName.substringAfterLast('.', "mp4").lowercase(Locale.US)
        val mediaFile = File(destDir, "media.$ext")
        copyLimited(input, mediaFile, MAX_ARCHIVE_BYTES)
        File(destDir, "index.html").writeText(buildVideoWrapperHtml("media.$ext", fallbackName), Charsets.UTF_8)
        val groups = JSONArray().apply {
            put(JSONObject().apply {
                put("name", "Video")
                put("items", JSONArray().apply {
                    put(slider("brightness", "Brightness", 0.25, 1.35, 0.05, 1.0))
                    put(slider("speed", "Playback Speed", 0.25, 2.0, 0.05, 1.0))
                    put(slider("dimIcons", "Dim Under Icons", 0.0, 0.6, 0.05, 0.15))
                })
            })
        }
        return buildEntry(
            id = id,
            name = fallbackName,
            desc = "Imported video wallpaper",
            page = "__custom/$id/index.html",
            adaptive = true,
            groups = groups
        )
    }

    private fun buildEntry(
        id: String,
        name: String,
        desc: String,
        page: String,
        adaptive: Boolean,
        groups: JSONArray
    ): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("desc", desc)
        put("page", page)
        put("status", "ready")
        put("adaptive", adaptive)
        put("custom", true)
        put("thumb", JSONObject().apply {
            put("bg", "linear-gradient(135deg,#1d3d35,#2c5e4f)")
        })
        put("groups", groups)
    }

    private fun slider(k: String, label: String, min: Double, max: Double, step: Double, def: Double): JSONObject =
        JSONObject().apply {
            put("k", k)
            put("label", label)
            put("type", "slider")
            put("min", min)
            put("max", max)
            put("step", step)
            put("default", def)
        }

    private fun copyLimited(input: InputStream, dest: File, maxBytes: Long) {
        val buffer = ByteArray(16384)
        var total = 0L
        FileOutputStream(dest).use { fos ->
            while (true) {
                val n = input.read(buffer)
                if (n <= 0) break
                total += n
                if (total > maxBytes) {
                    throw IllegalArgumentException("File exceeds 150 MB limit")
                }
                fos.write(buffer, 0, n)
            }
        }
    }

    private fun extractHtmlTitle(htmlFile: File): String? {
        if (!htmlFile.isFile) return null
        val head = htmlFile.bufferedReader(Charsets.UTF_8).use { r ->
            val buf = CharArray(4096)
            val n = r.read(buf)
            if (n > 0) String(buf, 0, n) else ""
        }
        val m = Regex("<title[^>]*>(.*?)</title>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)).find(head)
        return m?.groupValues?.get(1)?.replace(Regex("\\s+"), " ")?.trim()?.ifBlank { null }
    }

    private fun slugify(s: String): String =
        s.lowercase(Locale.US).replace(Regex("[^a-z0-9]+"), "-").trim('-').ifBlank { "theme" }

    private fun escHtml(s: String): String = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    private fun buildImageWrapperHtml(src: String, title: String): String = """
        <!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
        <style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:#0e1714;display:block}</style>
        </head><body><canvas id="c"></canvas><script>
        const c=document.getElementById('c'),x=c.getContext('2d'),img=new Image();img.src=${JSONObject.quote(src)};
        let P={brightness:1,motion:0.35,dimIcons:0.15},icons=[],paused=false,t0=performance.now();
        function fit(){const d=devicePixelRatio||1;c.width=innerWidth*d;c.height=innerHeight*d;}
        addEventListener('resize',fit);fit();
        function draw(now){
          if(!paused&&img.complete&&img.naturalWidth){
            const W=c.width,H=c.height,t=(now-t0)*0.0004*P.motion;
            const sc=Math.max(W/img.naturalWidth,H/img.naturalHeight)*(1+0.03*P.motion);
            const dw=img.naturalWidth*sc,dh=img.naturalHeight*sc;
            const ox=(W-dw)/2+Math.sin(t)*W*0.012*P.motion,oy=(H-dh)/2+Math.cos(t*0.8)*H*0.012*P.motion;
            x.save();x.filter='brightness('+P.brightness+')';x.drawImage(img,ox,oy,dw,dh);x.restore();
            if(P.dimIcons>0&&icons.length){
              x.fillStyle='rgba(0,0,0,'+P.dimIcons+')';
              for(const r of icons)x.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);
            }
          }
          requestAnimationFrame(draw);
        }
        requestAnimationFrame(draw);
        const h=window.chrome&&window.chrome.webview;
        if(h){h.addEventListener('message',e=>{const m=JSON.parse(e.data);
          if(m.t==='settings'&&m.params)Object.assign(P,m.params);
          else if(m.t==='icons')icons=m.vis&&m.r?m.r:[];
          else if(m.t==='pause')paused=!!m.v;
        });h.postMessage('ready');}
        </script></body></html>
    """.trimIndent()

    private fun buildVideoWrapperHtml(src: String, title: String): String = """
        <!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
        <style>html,body,video{margin:0;width:100%;height:100%;object-fit:cover;overflow:hidden;background:#0e1714;display:block}
        canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}</style></head>
        <body><video id="v" src=${JSONObject.quote(src)} autoplay loop muted playsinline></video><canvas id="ov"></canvas><script>
        const v=document.getElementById('v'),ov=document.getElementById('ov'),ox=ov.getContext('2d');
        let P={brightness:1,speed:1,dimIcons:0.15},icons=[];
        function fit(){const d=devicePixelRatio||1;ov.width=innerWidth*d;ov.height=innerHeight*d;drawIcons();}
        function drawIcons(){ox.clearRect(0,0,ov.width,ov.height);if(P.dimIcons>0&&icons.length){ox.fillStyle='rgba(0,0,0,'+P.dimIcons+')';for(const r of icons)ox.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);}}
        addEventListener('resize',fit);fit();
        function apply(){v.style.filter='brightness('+P.brightness+')';v.playbackRate=P.speed||1;drawIcons();}
        const h=window.chrome&&window.chrome.webview;
        if(h){h.addEventListener('message',e=>{const m=JSON.parse(e.data);
          if(m.t==='settings'&&m.params){Object.assign(P,m.params);apply();}
          else if(m.t==='icons'){icons=m.vis&&m.r?m.r:[];drawIcons();}
          else if(m.t==='pause'){if(m.v)v.pause();else v.play().catch(()=>{});}
        });h.postMessage('ready');}
        </script></body></html>
    """.trimIndent()

    companion object {
        const val MAX_ARCHIVE_BYTES = 150L * 1024L * 1024L
        const val MAX_ARCHIVE_FILES = 2000
        private val IMAGE_EXTS = setOf("png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "bmp")
        private val VIDEO_EXTS = setOf("mp4", "webm", "mkv", "mov")

        fun guessMimeType(name: String): String {
            return when (name.substringAfterLast('.', "").lowercase(Locale.US)) {
                "html", "htm" -> "text/html; charset=utf-8"
                "js", "mjs" -> "application/javascript; charset=utf-8"
                "css" -> "text/css; charset=utf-8"
                "json" -> "application/json; charset=utf-8"
                "svg" -> "image/svg+xml"
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "webp" -> "image/webp"
                "gif" -> "image/gif"
                "avif" -> "image/avif"
                "bmp" -> "image/bmp"
                "mp3" -> "audio/mpeg"
                "ogg" -> "audio/ogg"
                "wav" -> "audio/wav"
                "mp4" -> "video/mp4"
                "webm" -> "video/webm"
                "mov" -> "video/quicktime"
                "mkv" -> "video/x-matroska"
                "woff2" -> "font/woff2"
                "woff" -> "font/woff"
                "ttf" -> "font/ttf"
                else -> "application/octet-stream"
            }
        }
    }
}
