plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val kiddwaveAppUrl = System.getenv("KIDDWAVE_APP_URL")
    ?.takeIf { it.startsWith("https://") }
    ?: "https://kiddwave.netlify.app/"

android {
    namespace = "com.spotitube.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.spotitube.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 12
        versionName = "1.2.1"
        buildConfigField("String", "APP_URL", "\"$kiddwaveAppUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.media:media:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
