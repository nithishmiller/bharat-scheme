import { createLocalRepo } from './local.js';

/** One repository interface, two drivers: "local" (default) and "mysql" (when MYSQL_URL is set). */
export async function createRepo(config) {
  const repo = config.mysqlUrl
    ? await (await import('./mysql.js')).createMysqlRepo({ url: config.mysqlUrl })
    : createLocalRepo({ path: config.localDbPath });
  await repo.init();
  return repo;
}
