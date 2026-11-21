import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 4000,
    jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
    jwtSecretIsDefault: !env.JWT_SECRET,
    mysqlUrl: env.MYSQL_URL || '',
    localDbPath: env.LOCAL_DB_PATH || path.join(SERVER_ROOT, '.localdb.json'),
    schemesPath: env.SCHEMES_PATH || path.join(SERVER_ROOT, 'data', 'schemes.json'),
    schemesStubPath: path.join(SERVER_ROOT, 'data', 'schemes.stub.json'),
    openaiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
    corsOrigin: env.CORS_ORIGIN || '*',
    firebase: {
      projectId: env.FIREBASE_PROJECT_ID || '',
      clientEmail: env.FIREBASE_CLIENT_EMAIL || '',
      privateKey: (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
  };
}
