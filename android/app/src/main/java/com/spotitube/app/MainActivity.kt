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

        webView = BackgroundWebView(this).apply {
            setBackgroundColor(0xFF12100E.toInt())
            isFocusable = true
            isFocusableInTouchMode = true
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = settings.userAgentString.replace("; wv", "")
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val url = request?.url ?: return null
                    if (url.host == "appassets.androidplatform.net") {
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
                ): Boolean = false

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
            addJavascriptInterface(SpotiTubeBridge(), "SpotiTubeAndroid")
        }

        setContentView(webView)
        webView.requestFocus()
        val remoteUrl = BuildConfig.APP_URL.takeIf { it.startsWith("https://") }
        if (remoteUrl == null || remoteUrl == BUNDLED_APP_URL) {
            loadedBundledFallback = true
            webView.loadUrl(BUNDLED_APP_URL)
        } else {
            loadRemoteOrBundled(remoteUrl)
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
                val conn = (URL(remoteUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "HEAD"
                    connectTimeout = 1800
                    readTimeout = 1800
                    instanceFollowRedirects = false
                }
                val code = conn.responseCode
                val location = conn.getHeaderField("Location").orEmpty()
                conn.disconnect()
                code in 200..299 &&
                    !location.contains("__cookie_check") &&
                    !location.contains("accounts.google.com")
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
            runOnUiThread {
                webView.keepAliveInBackground = hasTrack && playing
                val serviceIntent = Intent(this@MainActivity, BackgroundAudioService::class.java).apply {
                    action = if (hasTrack) {
                        BackgroundAudioService.ACTION_START_OR_UPDATE
                    } else {
                        BackgroundAudioService.ACTION_STOP
                    }
                    putExtra(BackgroundAudioService.EXTRA_HAS_TRACK, hasTrack)
                    putExtra(BackgroundAudioService.EXTRA_IS_PLAYING, playing)
                    putExtra(BackgroundAudioService.EXTRA_TITLE, title)
                    putExtra(BackgroundAudioService.EXTRA_ARTIST, artist)
                    putExtra(BackgroundAudioService.EXTRA_ARTWORK_URL, artworkUrl)
                    putExtra(BackgroundAudioService.EXTRA_DURATION_MS, durationMs)
                    putExtra(BackgroundAudioService.EXTRA_POSITION_MS, positionMs)
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
