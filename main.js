import * as config from './config.js'
// import * as utils from './utils.js'
import { WebServer } from './WebServer.js'

import * as deps from './handlers/deps.js'
import * as gpu from './handlers/gpu.js'
import * as statics from './handlers/static.js'
import * as hwmon from './handlers/hwmon.js'

const server = new WebServer(config.SERVER_PORT)

await deps.register(server)
await gpu.register(server)
await hwmon.register(server)
await statics.register(server)

// const handlersPath = utils.trimSeparator(config.HANDLERS_PATH)
// for (const entry of Deno.readDirSync(handlersPath)) {
//   if (!entry.isFile) {
//     // No folders allowed
//     continue
//   }
//   if (!entry.name.endsWith('.js')) {
//     continue
//   }
//   const api = await import(`./${handlersPath}/${entry.name}`)
//   if (!api.register) {
//     continue
//   }
//   await api.register(server)
// }

await server.start()