// Firebase Cloud Messaging adapter. A strict no-op unless FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and
// FIREBASE_PRIVATE_KEY are all set AND the optional `firebase-admin` package is installed. Never fakes a send.
export async function createPushAdapter(config, log = console) {
  const f = config.firebase;
  const noop = { enabled: false, async send() { return { sent: false, reason: 'firebase-not-configured' }; } };
  if (!f.projectId || !f.clientEmail || !f.privateKey) return noop;
  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    log.warn?.('[push] FIREBASE_* set but firebase-admin is not installed (npm i firebase-admin); push disabled');
    return { ...noop, send: async () => ({ sent: false, reason: 'firebase-admin-not-installed' }) };
  }
  const app = admin.initializeApp({ credential: admin.credential.cert({ projectId: f.projectId, clientEmail: f.clientEmail, privateKey: f.privateKey }) });
  return {
    enabled: true,
    async send(token, { title, body }) {
      if (!token) return { sent: false, reason: 'no-device-token' };
      try {
        await admin.messaging(app).send({ token, notification: { title, body } });
        return { sent: true };
      } catch (e) {
        return { sent: false, reason: e.code || e.message };
      }
    },
  };
}
