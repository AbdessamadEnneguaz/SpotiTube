package com.spotitube.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var webView: BackgroundWebView
    @Volatile
    private var loadedBundledFallback = false
    @Volatile
    private var canGoBackInSpa = false

    private val mediaCommandReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val command = intent?.getStringExtra(BackgroundAudioService.EXTRA_COMMAND) ?: return
            val escaped = JSONObject.quote(command)
            webView.post {
                webView.evaluateJavascript(
                    "window.__spotitubeMediaControl && window.__spotitubeMediaControl($escaped)",
                    null
                )
            }
        }
    }

    companion object {
        private const val BUNDLED_APP_URL = "https://appassets.androidplatform.net/index.html"
        private val ALLOWED_APP_HOSTS = setOf(
            "kiddwave.vercel.app",
            "appassets.androidplatform.net"
        )
        private val ALLOWED_ARTWORK_HOSTS = setOf(
            "kiddwave.vercel.app",
            "i.ytimg.com",
            "img.youtube.com",
            "images.unsplash.com",
            "upload.wikimedia.org",
            "thumb.wikimedia.org"
        )
    }

    private fun isAllowedAppUri(uri: Uri?): Boolean {
        val scheme = uri?.scheme?.lowercase() ?: return false
        val host = uri.host?.lowercase() ?: return false
        return scheme == "https" && host in ALLOWED_APP_HOSTS
    }

    private fun sanitizeBridgeArtworkUrl(raw: String?): String {
        val trimmed = raw?.trim().orEmpty()
        if (trimmed.isEmpty() || trimmed.length > 512) return ""
        return try {
            val uri = Uri.parse(trimmed)
            val scheme = uri.scheme?.lowercase()
            val host = uri.host?.lowercase()
            if (scheme == "https" && host != null && (host in ALLOWED_ARTWORK_HOSTS || host.endsWith(".ytimg.com"))) {
                trimmed
            } else {
                ""
            }
        } catch (_: Exception) {
            ""
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestNotificationPermissionIfNeeded()

        ContextCompat.registerReceiver(
            this,
            mediaCommandReceiver,
            IntentFilter(BackgroundAudioService.ACTION_MEDIA_COMMAND),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        WebView.setWebContentsDebuggingEnabled(false)

        webView = BackgroundWebView(this).apply {
            setBackgroundColor(0xFF070607.toInt())
            isFocusable = true
            isFocusableInTouchMode = true
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            @Suppress("DEPRECATION")
            settings.allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION")
            settings.allowUniversalAccessFromFileURLs = false
            settings.setGeolocationEnabled(false)
            @Suppress("DEPRECATION")
            settings.saveFormData = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                settings.safeBrowsingEnabled = true
            }
            val baseUa = settings.userAgentString.replace("; wv", "").trim()
            settings.userAgentString = "$baseUa KiddwaveAndroid/${BuildConfig.VERSION_NAME}"
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val url = request?.url ?: return null
                    if (url.host == "appassets.androidplatform.net") {
                        val pathStr = url.path.orEmpty()
                        if (pathStr.contains("..")) {
                            return WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(), null)
                        }
                        val response = assetLoader.shouldInterceptRequest(url)
                        if (response != null) return response
                        // SPA fallback for client-side routes
                        return assetLoader.shouldInterceptRequest(Uri.parse(BUNDLED_APP_URL))
                    }
                    return super.shouldInterceptRequest(view, request)
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url ?: return true
                    // Strictly keep top-level WebView locked to Kiddwave origins; block file:/javascript:/untrusted schemes
                    if (request.isForMainFrame) {
                        if (isAllowedAppUri(url)) {
                            if (url.path?.endsWith(".apk", ignoreCase = true) == true) {
                                try {
                                    startActivity(Intent(Intent.ACTION_VIEW, url))
                                } catch (_: Exception) {
                                }
                                return true
                            }
                            return false
                        }
                        val scheme = url.scheme?.lowercase()
                        if (scheme == "https") {
                            try {
                                startActivity(Intent(Intent.ACTION_VIEW, url))
                            } catch (_: Exception) {
                            }
                        }
                        return true
                    }
                    return url.scheme?.lowercase() != "https"
                }

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?
                ) {
                    if (
                        request?.isForMainFrame == true &&
                        !loadedBundledFallback &&
                        (errorResponse?.statusCode ?: 0) >= 400
                    ) {
                        switchToBundledFallback()
                    }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true && !loadedBundledFallback) {
                        switchToBundledFallback()
                    }
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    view?.requestFocus()
                    if (!loadedBundledFallback && url != null && url != BUNDLED_APP_URL) {
                        if (
                            url.contains("__cookie_check") ||
                            url.contains("accounts.google.com")
                        ) {
                            switchToBundledFallback()
                            return
                        }
                        view?.evaluateJavascript(
                            "(function(){var t=(document.body&&document.body.innerText)||'';return t.length<600&&(t.indexOf('was not found')!==-1||t.indexOf('404')!==-1);})()"
                        ) { result ->
                            if (result == "true") {
                                switchToBundledFallback()
                            }
                        }
                    }
                }
            }
            setDownloadListener { url, _, _, _, _ ->
                val uri = try { Uri.parse(url) } catch (_: Exception) { null }
                if (isAllowedAppUri(uri)) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                    } catch (_: Exception) {
                    }
                }
            }
            val bridge = SpotiTubeBridge()
            addJavascriptInterface(bridge, "SpotiTubeAndroid")
            addJavascriptInterface(bridge, "KiddwaveAndroid")
        }

        setContentView(webView)
        webView.requestFocus()
        val configuredUrl = BuildConfig.APP_URL.takeIf { it.startsWith("https://") }
            ?: getString(R.string.app_url).takeIf { it.startsWith("https://") }
            ?: "https://kiddwave.vercel.app/"
        if (configuredUrl == BUNDLED_APP_URL) {
            loadedBundledFallback = true
            webView.loadUrl(BUNDLED_APP_URL)
        } else {
            loadRemoteOrBundled(configuredUrl)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (canGoBackInSpa) {
                    webView.evaluateJavascript("window.__spotitubeBack && window.__spotitubeBack()", null)
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun loadRemoteOrBundled(remoteUrl: String) {
        Thread {
            val remoteReachable = try {
                val parsed = Uri.parse(remoteUrl)
                if (!isAllowedAppUri(parsed)) {
                    false
                } else {
                    val conn = (URL(remoteUrl).openConnection() as HttpURLConnection).apply {
                        requestMethod = "HEAD"
                        connectTimeout = 2500
                        readTimeout = 2500
                        instanceFollowRedirects = true
                    }
                    try {
                        val code = conn.responseCode
                        val finalUrl = conn.url?.toString().orEmpty()
                        val finalUri = Uri.parse(finalUrl)
                        code in 200..399 &&
                            isAllowedAppUri(finalUri) &&
                            !finalUrl.contains("__cookie_check") &&
                            !finalUrl.contains("accounts.google.com")
                    } finally {
                        conn.disconnect()
                    }
                }
            } catch (_: Exception) {
                false
            }
            runOnUiThread {
                if (!isFinishing && !isDestroyed) {
                    if (remoteReachable) {
                        webView.loadUrl(remoteUrl)
                    } else {
                        loadedBundledFallback = true
                        webView.loadUrl(BUNDLED_APP_URL)
                    }
                }
            }
        }.start()
    }

    private fun switchToBundledFallback() {
        if (loadedBundledFallback) return
        loadedBundledFallback = true
        webView.post {
            webView.stopLoading()
            webView.loadUrl(BUNDLED_APP_URL)
        }
    }

    override fun onPause() {
        // Keep WebView timers and audio running when user leaves app during active playback
        super.onPause()
        if (webView.keepAliveInBackground) {
            webView.onResume()
            webView.resumeTimers()
        }
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(mediaCommandReceiver)
        } catch (_: Exception) {
        }
        stopService(Intent(this, BackgroundAudioService::class.java))
        super.onDestroy()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }
    }

    inner class SpotiTubeBridge {
        @JavascriptInterface
        fun getAppVersion(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun setPlayingState(playing: Boolean, title: String, artist: String) {
            updateMediaState(playing, playing, title, artist, "", 0L, 0L)
        }

        @JavascriptInterface
        fun updateMediaState(
            hasTrack: Boolean,
            playing: Boolean,
            title: String,
            artist: String,
            artworkUrl: String,
            durationMs: Long,
            positionMs: Long
        ) {
            val safeTitle = title.replace(Regex("[\\u0000-\\u001F\\u007F]"), "").trim().take(140).ifEmpty { "Kiddwave" }
            val safeArtist = artist.replace(Regex("[\\u0000-\\u001F\\u007F]"), "").trim().take(140).ifEmpty { "Global Soundstage" }
            val safeArtwork = sanitizeBridgeArtworkUrl(artworkUrl)
            val safeDuration = durationMs.coerceIn(0L, 12L * 3600L * 1000L)
            val safePosition = positionMs.coerceIn(0L, 12L * 3600L * 1000L)

            runOnUiThread {
                val activeUri = try { Uri.parse(webView.url.orEmpty()) } catch (_: Exception) { null }
                if (!isAllowedAppUri(activeUri)) return@runOnUiThread

                webView.keepAliveInBackground = hasTrack && playing
                val serviceIntent = Intent(this@MainActivity, BackgroundAudioService::class.java).apply {
                    action = if (hasTrack) {
                        BackgroundAudioService.ACTION_START_OR_UPDATE
                    } else {
                        BackgroundAudioService.ACTION_STOP
                    }
                    putExtra(BackgroundAudioService.EXTRA_HAS_TRACK, hasTrack)
                    putExtra(BackgroundAudioService.EXTRA_IS_PLAYING, playing)
                    putExtra(BackgroundAudioService.EXTRA_TITLE, safeTitle)
                    putExtra(BackgroundAudioService.EXTRA_ARTIST, safeArtist)
                    putExtra(BackgroundAudioService.EXTRA_ARTWORK_URL, safeArtwork)
                    putExtra(BackgroundAudioService.EXTRA_DURATION_MS, safeDuration)
                    putExtra(BackgroundAudioService.EXTRA_POSITION_MS, safePosition)
                }
                if (hasTrack && playing) {
                    ContextCompat.startForegroundService(this@MainActivity, serviceIntent)
                } else {
                    try {
                        startService(serviceIntent)
                    } catch (_: Exception) {
                        // Safe no-op if Android blocks non-foreground service start while backgrounded
                    }
                }
            }
        }

        @JavascriptInterface
        fun updatePlaybackPosition(durationMs: Long, positionMs: Long, playing: Boolean) {
            val safeDuration = durationMs.coerceIn(0L, 12L * 3600L * 1000L)
            val safePosition = positionMs.coerceIn(0L, 12L * 3600L * 1000L)

            runOnUiThread {
                val activeUri = try { Uri.parse(webView.url.orEmpty()) } catch (_: Exception) { null }
                if (!isAllowedAppUri(activeUri)) return@runOnUiThread

                val serviceIntent = Intent(this@MainActivity, BackgroundAudioService::class.java).apply {
                    action = BackgroundAudioService.ACTION_UPDATE_POSITION
                    putExtra(BackgroundAudioService.EXTRA_DURATION_MS, safeDuration)
                    putExtra(BackgroundAudioService.EXTRA_POSITION_MS, safePosition)
                    putExtra(BackgroundAudioService.EXTRA_IS_PLAYING, playing)
                }
                try {
                    startService(serviceIntent)
                } catch (_: Exception) {
                    // Safe no-op when background service start is restricted
                }
            }
        }

        @JavascriptInterface
        fun setCanGoBack(canGoBack: Boolean) {
            canGoBackInSpa = canGoBack
        }

        @JavascriptInterface
        fun showKeyboard() {
            runOnUiThread {
                if (!webView.hasFocus()) {
                    webView.requestFocus()
                }
                val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
                imm?.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT)
                WindowCompat.getInsetsController(window, webView).show(WindowInsetsCompat.Type.ime())
            }
        }
    }
}
