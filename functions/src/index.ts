import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { firestore, messaging } from './firebaseAdmin.js';

type RegisterTokenData = {
  userId: string;
  token: string;
  platform?: string;
};

export const registerDeviceToken = onCall<RegisterTokenData>(async (request) => {
  const { userId, token, platform } = request.data || ({} as RegisterTokenData);

  if (!userId || !token) {
    throw new HttpsError('invalid-argument', 'userId and token are required');
  }

  // If you use Firebase Auth, you can enforce auth here:
  // if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required');

  const tokenRef = firestore.collection('fcmTokens').doc(token);
  await tokenRef.set(
    {
      userId,
      token,
      platform: platform || 'unknown',
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { ok: true };
});

// Simple HTTP endpoint for token registration (easy to call from the web app).
export const registerDeviceTokenHttp = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { userId, token, platform } = (req.body ?? {}) as RegisterTokenData;

    if (!userId || !token) {
      res.status(400).json({ error: 'userId and token are required' });
      return;
    }

    const tokenRef = firestore.collection('fcmTokens').doc(token);
    await tokenRef.set(
      {
        userId,
        token,
        platform: platform || 'unknown',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    res.json({ ok: true });
  } catch (err: any) {
    logger.error('registerDeviceTokenHttp failed', err);
    res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

export const sendTestNotification = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { userId, title, body, data } = (req.body ?? {}) as {
      userId?: string;
      title?: string;
      body?: string;
      data?: Record<string, string>;
    };

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const snap = await firestore.collection('fcmTokens').where('userId', '==', userId).get();

    const tokens = snap.docs.map((d) => d.id).filter(Boolean);

    if (!tokens.length) {
      res.status(404).json({ error: 'No tokens registered for user' });
      return;
    }

    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: title || 'Test notification',
        body: body || 'Hello from FCM',
      },
      data: data || {},
    });

    // Clean up invalid tokens
    const invalidTokens: string[] = [];
    resp.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = (r.error as any)?.code as string | undefined;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokens[idx]);
        }
        logger.warn('FCM send error', { token: tokens[idx], code, message: r.error?.message });
      }
    });

    await Promise.all(
      invalidTokens.map((t) => firestore.collection('fcmTokens').doc(t).delete().catch(() => null)),
    );

    res.json({
      ok: true,
      tokens: tokens.length,
      successCount: resp.successCount,
      failureCount: resp.failureCount,
      invalidTokensRemoved: invalidTokens.length,
    });
  } catch (err: any) {
    logger.error('sendTestNotification failed', err);
    res.status(500).json({ error: err?.message || 'Internal error' });
  }
});