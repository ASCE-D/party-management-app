# Party Management App

## Push Notifications (Firebase Cloud Messaging)
This project includes **Firebase Cloud Messaging (FCM)** support for web push notifications.

### 1) Client setup (Web)
1. Create a Firebase project and add a **Web App**.
2. In Firebase Console → **Project settings** → **Cloud Messaging**:
   - Generate/Copy your **Web Push certificates (VAPID key)**.
3. Copy `.env.example` to `.env` and fill:
   - `VITE_FIREBASE_*` values from your Firebase web app config
   - `VITE_FIREBASE_VAPID_KEY`
   - `VITE_REGISTER_DEVICE_TOKEN_ENDPOINT`

> Note: `public/firebase-messaging-sw.js` is required to receive background notifications. It must be able to initialize Firebase.

### 2) Server setup (Firebase Cloud Functions)

A minimal backend is included under `functions/`:
- `registerDeviceToken` (callable): stores a token in Firestore collection `fcmTokens`
- `sendTestNotification` (HTTP): sends a notification to all tokens registered for a `userId`

#### Deploy

```bash
cd functions
npm i
npm run build
firebase deploy --only functions
```

#### Local development

For local emulation you can use:

```bash
cd functions
npm i
npm run build
firebase emulators:start --only functions
```

Firebase Admin credentials:
- In deployed Cloud Functions, credentials are automatically provided.
- Locally, set `GOOGLE_APPLICATION_CREDENTIALS` to a Firebase service account JSON path.

### 3) Testing send

Call the deployed function URL (from Firebase console) with:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"userId":"demo-user","title":"Hello","body":"World"}' \
  https://<region>-<project>.cloudfunctions.net/sendTestNotification
```

### Important notes

- The current app registers a demo user id (`demo-user`) in `src/App.tsx`. Replace this with your real authenticated user id.
- For production security, protect the send endpoint (e.g., Firebase Auth + IAM or App Check).