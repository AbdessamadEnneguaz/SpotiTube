package com.spotitube.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media.session.MediaButtonReceiver
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class BackgroundAudioService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private lateinit var mediaSession: MediaSessionCompat
    private val artworkExecutor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private var currentTitle: String = "Kiddwave"
    private var currentArtist: String = "Global Soundstage"
    private var currentArtworkUrl: String = ""
    private var currentDurationMs: Long = 0L
    private var currentPositionMs: Long = 0L
    private var isCurrentlyPlaying: Boolean = false
    private var hasActiveTrack: Boolean = false
    private var isForegroundActive: Boolean = false

    private var cachedArtworkUrl: String = ""
    private var cachedArtworkBitmap: Bitmap? = null
    private var defaultArtworkBitmap: Bitmap? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        defaultArtworkBitmap = try {
            BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        } catch (_: Exception) {
            null
        }
        initMediaSession()
    }

    private fun initMediaSession() {
        mediaSession = MediaSessionCompat(this, "SpotiTubeMediaSession").apply {
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                    MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    if (hasActiveTrack) {
                        isCurrentlyPlaying = true
                        syncMediaSessionAndNotification()
                    }
                    dispatchMediaCommand("play")
                }

                override fun onPause() {
                    if (hasActiveTrack) {
                        isCurrentlyPlaying = false
                        syncMediaSessionAndNotification()
                    }
                    dispatchMediaCommand("pause")
                }

                override fun onSkipToNext() {
                    dispatchMediaCommand("next")
                }

                override fun onSkipToPrevious() {
                    dispatchMediaCommand("previous")
                }

                override fun onStop() {
                    dispatchMediaCommand("stop")
                    stopPlaybackService()
                }
            })
            isActive = true
        }
    }

    private fun dispatchMediaCommand(command: String) {
        val intent = Intent(ACTION_MEDIA_COMMAND).apply {
            setPackage(packageName)
            putExtra(EXTRA_COMMAND, command)
        }
        sendBroadcast(intent)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        MediaButtonReceiver.handleIntent(mediaSession, intent)

        when (intent?.action) {
            ACTION_STOP -> {
                stopPlaybackService()
                return START_NOT_STICKY
            }
            ACTION_TOGGLE_PLAY_PAUSE -> {
                val targetPlay = !isCurrentlyPlaying
                if (hasActiveTrack) {
                    isCurrentlyPlaying = targetPlay
                    syncMediaSessionAndNotification()
                }
                dispatchMediaCommand(if (targetPlay) "play" else "pause")
                return START_STICKY
            }
            ACTION_NEXT -> {
                dispatchMediaCommand("next")
                return START_STICKY
            }
            ACTION_PREVIOUS -> {
                dispatchMediaCommand("previous")
                return START_STICKY
            }
        }

        val hasTrack = intent?.getBooleanExtra(EXTRA_HAS_TRACK, true) ?: true
        if (!hasTrack) {
            stopPlaybackService()
            return START_NOT_STICKY
        }

        hasActiveTrack = true
        isCurrentlyPlaying = intent?.getBooleanExtra(EXTRA_IS_PLAYING, true) ?: true
        currentTitle = intent?.getStringExtra(EXTRA_TITLE)?.takeIf { it.isNotBlank() } ?: "Kiddwave"
        currentArtist = intent?.getStringExtra(EXTRA_ARTIST)?.takeIf { it.isNotBlank() } ?: "Global Soundstage"
        val incomingArt = intent?.getStringExtra(EXTRA_ARTWORK_URL).orEmpty()
        currentDurationMs = intent?.getLongExtra(EXTRA_DURATION_MS, 0L) ?: 0L
        currentPositionMs = intent?.getLongExtra(EXTRA_POSITION_MS, 0L) ?: 0L

        if (incomingArt != currentArtworkUrl) {
            currentArtworkUrl = incomingArt
            if (incomingArt.startsWith("https://") && incomingArt != cachedArtworkUrl) {
                fetchArtworkAsync(incomingArt)
            }
        }

        syncMediaSessionAndNotification()
        return START_STICKY
    }

    private fun fetchArtworkAsync(urlStr: String) {
        artworkExecutor.execute {
            val loaded = try {
                val parsed = URL(urlStr)
                if (!parsed.protocol.equals("https", ignoreCase = true)) {
                    null
                } else {
                    val conn = (parsed.openConnection() as HttpURLConnection).apply {
                        connectTimeout = 3000
                        readTimeout = 3000
                        instanceFollowRedirects = false
                    }
                    try {
                        if (conn.responseCode in 200..299 && (conn.contentLength <= 2 * 1024 * 1024)) {
                            conn.inputStream.use { BitmapFactory.decodeStream(it) }
                        } else {
                            null
                        }
                    } finally {
                        conn.disconnect()
                    }
                }
            } catch (_: Exception) {
                null
            }
            if (loaded != null && urlStr == currentArtworkUrl && hasActiveTrack) {
                mainHandler.post {
                    if (urlStr == currentArtworkUrl && hasActiveTrack) {
                        cachedArtworkUrl = urlStr
                        cachedArtworkBitmap = loaded
                        syncMediaSessionAndNotification()
                    }
                }
            }
        }
    }

    private fun syncMediaSessionAndNotification() {
        val artwork = if (currentArtworkUrl.isNotEmpty() && currentArtworkUrl == cachedArtworkUrl) {
            cachedArtworkBitmap ?: defaultArtworkBitmap
        } else {
            defaultArtworkBitmap
        }

        val metadataBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Kiddwave")
        if (currentDurationMs > 0L) {
            metadataBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDurationMs)
        }
        if (artwork != null) {
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork)
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, artwork)
        }
        mediaSession.setMetadata(metadataBuilder.build())
        mediaSession.isActive = true

        val stateCode = if (isCurrentlyPlaying) {
            PlaybackStateCompat.STATE_PLAYING
        } else {
            PlaybackStateCompat.STATE_PAUSED
        }
        val stateActions =
            PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_STOP

        mediaSession.setPlaybackState(
            PlaybackStateCompatBuilderCompat.build(
                stateCode,
                currentPositionMs,
                if (isCurrentlyPlaying) 1.0f else 0.0f,
                stateActions
            )
        )

        val notification = buildMediaNotification(artwork)
        val nm = getSystemService(NotificationManager::class.java)

        if (isCurrentlyPlaying) {
            if (!isForegroundActive) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                    )
                } else {
                    startForeground(NOTIFICATION_ID, notification)
                }
                isForegroundActive = true
            } else {
                nm?.notify(NOTIFICATION_ID, notification)
            }
            acquireWakeLock()
        } else {
            releaseWakeLock()
            if (isForegroundActive) {
                stopForeground(STOP_FOREGROUND_DETACH)
                isForegroundActive = false
            }
            nm?.notify(NOTIFICATION_ID, notification)
        }
    }

    private fun buildMediaNotification(artwork: Bitmap?): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val prevPendingIntent = serviceActionIntent(ACTION_PREVIOUS, 10)
        val togglePendingIntent = serviceActionIntent(ACTION_TOGGLE_PLAY_PAUSE, 11)
        val nextPendingIntent = serviceActionIntent(ACTION_NEXT, 12)
        val stopPendingIntent = serviceActionIntent(ACTION_STOP, 13)

        val toggleIcon = if (isCurrentlyPlaying) {
            android.R.drawable.ic_media_pause
        } else {
            android.R.drawable.ic_media_play
        }
        val toggleLabel = if (isCurrentlyPlaying) "Pause" else "Play"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setLargeIcon(artwork)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText("Kiddwave")
            .setContentIntent(contentPendingIntent)
            .setDeleteIntent(stopPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOngoing(isCurrentlyPlaying)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevPendingIntent)
            .addAction(toggleIcon, toggleLabel, togglePendingIntent)
            .addAction(android.R.drawable.ic_media_next, "Next", nextPendingIntent)
            .setStyle(
                MediaStyle()
                    .setMediaSession(mediaSession.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2)
            )
            .build()
    }

    private fun serviceActionIntent(action: String, requestCode: Int): PendingIntent {
        val intent = Intent(this, BackgroundAudioService::class.java).apply {
            this.action = action
        }
        return PendingIntent.getService(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun stopPlaybackService() {
        hasActiveTrack = false
        isCurrentlyPlaying = false
        releaseWakeLock()
        try {
            mediaSession.isActive = false
        } catch (_: Exception) {
        }
        if (isForegroundActive) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            isForegroundActive = false
        } else {
            val nm = getSystemService(NotificationManager::class.java)
            nm?.cancel(NOTIFICATION_ID)
        }
        stopSelf()
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SpotiTube::BackgroundAudioLock").apply {
            setReferenceCounted(false)
            acquire(6 * 60 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {
        } finally {
            wakeLock = null
        }
    }

    override fun onDestroy() {
        releaseWakeLock()
        try {
            mediaSession.isActive = false
            mediaSession.release()
        } catch (_: Exception) {
        }
        artworkExecutor.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Music Player Controls",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Lock-screen & notification shade playback controls"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(channel)
        }
    }

    private object PlaybackStateCompatBuilderCompat {
        fun build(state: Int, position: Long, speed: Float, actions: Long): PlaybackStateCompat {
            return PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, position, speed)
                .build()
        }
    }

    companion object {
        const val CHANNEL_ID = "spotitube_media_bar_v2"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_OR_UPDATE = "com.spotitube.app.ACTION_START_OR_UPDATE"
        const val ACTION_TOGGLE_PLAY_PAUSE = "com.spotitube.app.ACTION_TOGGLE_PLAY_PAUSE"
        const val ACTION_NEXT = "com.spotitube.app.ACTION_NEXT"
        const val ACTION_PREVIOUS = "com.spotitube.app.ACTION_PREVIOUS"
        const val ACTION_STOP = "com.spotitube.app.ACTION_STOP"
        const val ACTION_MEDIA_COMMAND = "com.spotitube.app.ACTION_MEDIA_COMMAND"
        const val EXTRA_COMMAND = "extra_command"
        const val EXTRA_HAS_TRACK = "extra_has_track"
        const val EXTRA_IS_PLAYING = "extra_is_playing"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_ARTIST = "extra_artist"
        const val EXTRA_ARTWORK_URL = "extra_artwork_url"
        const val EXTRA_DURATION_MS = "extra_duration_ms"
        const val EXTRA_POSITION_MS = "extra_position_ms"
    }
}
