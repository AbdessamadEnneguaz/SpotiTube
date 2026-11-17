package com.spotitube.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: BackgroundWebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestNotificationPermissionIfNeeded()

        webView = BackgroundWebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = settings.userAgentString.replace("; wv", "")
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean = false
            }
            addJavascriptInterface(SpotiTubeBridge(), "SpotiTubeAndroid")
        }

        setContentView(webView)
        webView.loadUrl(BuildConfig.APP_URL)

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

    override fun onPause() {
        // Keep WebView timers and audio running when user leaves app during active playback
        if (!webView.keepAliveInBackground) {
            super.onPause()
        } else {
            super.onPause()
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
