-keepclassmembers class com.spotitube.app.MainActivity$SpotiTubeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface, *Annotation*
-keep class com.spotitube.app.BackgroundWebView { *; }
-keep class com.spotitube.app.BackgroundAudioService { *; }
-keep class androidx.webkit.** { *; }
-keep class androidx.media.** { *; }
