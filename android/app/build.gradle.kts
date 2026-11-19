import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

// The release signing key. android/key.properties is not in git (see
// android/key.properties.example for what goes in it).
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.reader(Charsets.UTF_8).use { reader ->
        keystoreProperties.load(reader)
    }
}

android {
    namespace = "com.decidixteam.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.decidixteam.app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Both come from `version:` in pubspec.yaml (1.0.0+1 is name 1.0.0, code 1).
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                val keyAliasProp = keystoreProperties.getProperty("keyAlias")
                val keyPasswordProp = keystoreProperties.getProperty("keyPassword")
                val storePasswordProp = keystoreProperties.getProperty("storePassword")
                val storeFileProp = keystoreProperties.getProperty("storeFile")

                if (keyAliasProp != null && keyPasswordProp != null && storePasswordProp != null && storeFileProp != null) {
                    keyAlias = keyAliasProp
                    keyPassword = keyPasswordProp
                    storePassword = storePasswordProp
                    val resolvedStoreFile = if (file(storeFileProp).exists()) {
                        file(storeFileProp)
                    } else if (rootProject.file(storeFileProp).exists()) {
                        rootProject.file(storeFileProp)
                    } else {
                        file(storeFileProp)
                    }
                    storeFile = resolvedStoreFile
                } else {
                    logger.warn("WARNING: android/key.properties is missing one or more required keys (keyAlias, keyPassword, storePassword, storeFile).")
                }
            }
        }
    }

    buildTypes {
        release {
            if (keystorePropertiesFile.exists() && signingConfigs.getByName("release").storeFile?.exists() == true) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                // No key.properties: sign with the debug key so `flutter run --release`
                // works on a developer machine. Google Play rejects this build.
                logger.warn("WARNING: android/key.properties not found or storeFile missing, signing the release build with the debug key.")
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
