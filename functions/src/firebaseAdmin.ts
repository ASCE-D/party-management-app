import admin from 'firebase-admin';

function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length) {
    return admin.app();
  }

  // In Cloud Functions, credentials are automatically available.
  // For local/dev, GOOGLE_APPLICATION_CREDENTIALS can point to a service account JSON.
  return admin.initializeApp();
}

export const firebaseAdminApp = initFirebaseAdmin();
export const firestore = admin.firestore(firebaseAdminApp);
export const messaging = admin.messaging(firebaseAdminApp);