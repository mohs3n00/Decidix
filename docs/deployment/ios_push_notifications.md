# Decidix iOS Push Notification & APNs Configuration Guide

This guide details the end-to-end setup for Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM) on iOS for Decidix.

---

## 1. Prerequisites

- **Apple Developer Account** (Individual or Organization) with Admin/Account Holder access.
- **Firebase Project:** `decidix` (Project Number: `50086376748`).
- **iOS Bundle Identifier:** `com.decidixteam.app` (must match Firebase and Xcode).
- **Physical iOS Device:** APNs push notifications require testing on a physical iPhone/iPad running iOS 14+. Simulators cannot register with APNs or receive background remote notifications.

---

## 2. Apple Developer Portal Configuration

### Step 2.1: Register App ID
1. Log into [Apple Developer Portal](https://developer.apple.com/account).
2. Navigate to **Certificates, Identifiers & Profiles** > **Identifiers**.
3. Select or create App ID with Bundle ID: `com.decidixteam.app`.
4. In **Capabilities**, enable:
   - **Push Notifications**

### Step 2.2: Generate APNs Authentication Key (.p8)
*An APNs Auth Key does not expire and can be used across multiple apps under the same Apple Developer Team.*

1. Navigate to **Certificates, Identifiers & Profiles** > **Keys**.
2. Click **+** (Register a new key).
3. Name the key: `Decidix APNs Key`.
4. Check **Apple Push Notifications service (APNs)**.
5. Click **Continue** and **Register**.
6. **Download the `.p8` key file immediately** (Apple only allows downloading it once).
7. Note down:
   - **Key ID** (10-character identifier, e.g. `ABC123XYZ4`)
   - **Team ID** (found at top right of your Apple Developer account, e.g. `XYZ9876543`)

---

## 3. Firebase Console Configuration

1. Open the [Firebase Console](https://console.firebase.google.com/) for project `decidix`.
2. Navigate to **Project Settings** (gear icon) > **Cloud Messaging**.
3. Scroll down to **Apple app configuration**.
4. If an iOS app is not yet added:
   - Click **Add app** > **iOS**.
   - Enter Bundle ID: `com.decidixteam.app`.
   - Download the generated `GoogleService-Info.plist`.
5. Under **APNs Authentication Key**:
   - Click **Upload**.
   - Select your `.p8` file downloaded from Apple.
   - Enter your **Key ID** and **Team ID**.
   - Click **Save**.

---

## 4. Xcode Project Configuration

### Step 4.1: Add `GoogleService-Info.plist`
1. Open `ios/Runner.xcworkspace` in Xcode.
2. Drag and drop `GoogleService-Info.plist` into `Runner/Runner` folder in Xcode.
3. In the dialog:
   - Check **Copy items if needed**.
   - Select **Create groups**.
   - Target Membership: ensure **Runner** is checked.
   - Click **Finish**.

> **Note:** A template is provided at `ios/Runner/GoogleService-Info.plist.example`. Do not commit production plists containing proprietary team IDs to public repositories.

### Step 4.2: Enable Required Capabilities
1. In Xcode, select the **Runner** project in the left navigator.
2. Select the **Runner** target.
3. Open the **Signing & Capabilities** tab.
4. Click **+ Capability**:
   - Add **Push Notifications**.
5. Click **+ Capability** again:
   - Add **Background Modes**.
   - Check **Remote notifications**.
   - Check **Background fetch**.

---

## 5. Client Implementation Reference

Decidix uses official FlutterFire packages (`firebase_core` and `firebase_messaging`).

- **Entry point & Background Handler:** `lib/core/notifications/notification_service.dart`
- **Foreground Presentation:** Handled via:
  ```dart
  await messaging.setForegroundNotificationPresentationOptions(
    alert: true,
    badge: true,
    sound: true,
  );
  ```
- **Permission Request:** Handled on initial app launch via `messaging.requestPermission(...)`.
- **Token Synchronization:** Device tokens are obtained via `messaging.onRegistered` and registered with the Decidix backend (`POST /v1/notifications/device-token`) with platform `'ios'`.
- **Token Cleanup:** Unregistered on user sign-out (`DELETE /v1/notifications/device-token`).

---

## 6. Testing & Validation Checklist

| Test Case | Procedure | Expected Result |
| --- | --- | --- |
| Permission Prompt | Launch app for the first time on iOS device | System alert prompts user to allow notifications |
| Token Registration | Inspect backend logs / database after permission granted | `POST /v1/notifications/device-token` registered with `platform = 'ios'` |
| Foreground Notification | Trigger notification while Decidix is active | Banner displays with sound and badge |
| Background Notification | Put app in background and trigger notification | System notification appears in Notification Center |
| Notification Tap | Tap received notification | App opens and routes to target screen (e.g. `/decisions`, `/intelligence`) |
| Sign-out Cleanup | User logs out of Decidix | `DELETE /v1/notifications/device-token` deactivates the device token |

