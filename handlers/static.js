import * as config from '../config.js'
import * as utils from '../utils.js'
import * as responses from '../responses.js'

export const register = server => {
  const staticsPath = utils.trimSeparator(config.STATIC_PATH)
  const baseDir = utils.separatorEnd(config.STATIC_PATH)
  const htmlExt = '.html'
  const readAt = name => Deno.readTextFileSync(baseDir + name)
  const mimesByExt = {
    [htmlExt]: 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css'
  }
  const filesByName = new Map()
  for (const entry of Deno.readDirSync(baseDir)) {
    if (!entry.isFile) {
      // No folders allowed
      continue
    }
    let result
    for (const ext in mimesByExt) {
      if (entry.name.endsWith(ext)) {
        result = {
          name: entry.name,
          extension: ext,
          mimeType: mimesByExt[ext],
          content: '',
          isHtml: ext === htmlExt
        }
      }
    }
    if (!result) {
      // Unrecognized file type
      continue
    }
    // Load from disk on each request if cache is disabled.
    result.content = config.DIABLE_STATIC_CACHE ? null : readAt(entry.name)
    filesByName.set(entry.name, result)
  }

  const matchExtensions = Object.keys(mimesByExt).map(v => '.*\\' + v).join('|')

  const index = filesByName.get('index.html')
  if (index) {
    const routeToIndex = () => {
      return responses.mime(index.content ?? readAt(index.name), index.mimeType)
    }
    server.map('/index.html', routeToIndex)
    server.map('/index', routeToIndex)
    server.map('/', routeToIndex)
  }
  server.map(`/${staticsPath}/:name(${matchExtensions})`, (_, pars) => {
    const name = pars.pathname.groups.name
    const file = filesByName.get(name)
    return file ?
      responses.mime(file.content ?? readAt(file.name), file.mimeType) :
      responses.notFound(name)
  })
}