// Usage: npm run seed   (uses MYSQL_URL if set, else the local JSON file)
import { loadConfig } from '../src/config.js';
import { createRepo } from '../src/repo/index.js';
import { seed } from '../src/seed.js';

const config = loadConfig();
const repo = await createRepo(config);
const info = await seed(repo, config);
console.log(`Seeded (${repo.driver} driver): ${info.count} schemes from ${info.source}${info.isStub ? ' [STUB]' : ''}.`);
console.log('Demo user: demo@bharatscheme.in / demo1234   Admin: admin@bharatscheme.in / admin1234');
await repo.close();
