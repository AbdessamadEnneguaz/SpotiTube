package com.spotitube.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
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
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: BackgroundWebView
    private var loadedBundledFallback = false

    companion object {
        private const val BUNDLED_APP_URL = "https://appassets.androidplatform.net/index.html"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestNotificationPermissionIfNeeded()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = BackgroundWebView(this).apply {
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
            }
            addJavascriptInterface(SpotiTubeBridge(), "SpotiTubeAndroid")
        }

        setContentView(webView)
        val startUrl = BuildConfig.APP_URL.takeIf { it.startsWith("https://") } ?: BUNDLED_APP_URL
        if (startUrl == BUNDLED_APP_URL) {
            loadedBundledFallback = true
        }
        webView.loadUrl(startUrl)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun switchToBundledFallback() {
        loadedBundledFallback = true
        webView.post {
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
            runOnUiThread {
                webView.keepAliveInBackground = playing
                val serviceIntent = Intent(this@MainActivity, BackgroundAudioService::class.java).apply {
                    action = if (playing) {
                        BackgroundAudioService.ACTION_START_OR_UPDATE
                    } else {
                        BackgroundAudioService.ACTION_STOP
                    }
                    putExtra(BackgroundAudioService.EXTRA_TITLE, title)
                    putExtra(BackgroundAudioService.EXTRA_ARTIST, artist)
                }
                if (playing) {
                    ContextCompat.startForegroundService(this@MainActivity, serviceIntent)
                } else {
                    startService(serviceIntent)
                }
            }
        }
    }
}
