import { loadConfig } from './config.js';
import { createRepo } from './repo/index.js';
import { seed } from './seed.js';
import { createPushAdapter } from './firebase.js';
import { createApp } from './app.js';

const config = loadConfig();
if (config.jwtSecretIsDefault) console.warn('[auth] JWT_SECRET not set; using an insecure development secret');
const repo = await createRepo(config);
const info = await seed(repo, config);
const push = await createPushAdapter(config);
const app = createApp({ repo, config, push });

app.listen(config.port, () => {
  console.log(`Bharat Scheme API on http://localhost:${config.port}  (db: ${repo.driver}, schemes: ${info.count}${info.isStub ? ' [STUB]' : ''}, ai: ${config.openaiKey ? 'openai' : 'offline'}, push: ${push.enabled ? 'firebase' : 'off'})`);
});
