import * as parsers from '../parsers.js'
import * as config from '../config.js'
import * as responses from '../responses.js'
import * as utils from '../utils.js'
import { toCamelCalse } from '../utils.js'

export const register = server => {
  const baseDir = `/${utils.trimSeparator(config.HWMON_PATH)}/`

  const readAt = name => Deno.readTextFileSync(baseDir + name).trim()
  const names = []

  const ignored = new Set([])

  for (const entry of Deno.readDirSync(baseDir)) {
    if (!entry.isFile) {
      continue
    }
    if (ignored.has(entry.name)) {
      continue
    }
    try {
      // Just try a read to see if it's valid
      const _ = readAt(entry.name)
      names.push(entry.name)
    } catch (error) {
      if (error.name === 'PermissionDenied') {
        // Nothing to do
        continue
      }
      if (error.message.toLowerCase().startsWith('no data available')) {
        // Nothing to do
        continue
      }
      throw error
    }
  }

  const namesByPrefix = names.sort().reduce((prev, cur) => {
    let prefix = cur
    let name = cur
    const pi = cur.indexOf('_')
    if (pi > -1) {
      // Prefix found
      prefix = cur.substring(0, pi)
      name = cur.substring(pi + 1)
    }
    const dst = (prev[prefix] || (prev[prefix] = {}))
    dst[toCamelCalse(name)] = cur
    return prev
  }, {})

  // Try to fix up some names in favor of their labels
  const endsWithDigit = /.*[0-9]/
  const digits = /[0-9]/
  for (const e of Object.entries(namesByPrefix)) {
    const [prefix, names] = e
    if (names.length <= 1) {
      continue
    }
    if (!names.label || !endsWithDigit.test(prefix)) {
      continue
    }
    const fixedPrefix = prefix.substring(0, prefix.search(digits))
    const content = readAt(names.label)
    const fixedName = toCamelCalse(`${fixedPrefix}_${content}`)
    // Delete previous mapping, no need for the label anymore
    delete namesByPrefix[prefix]
    delete names.label
    // Create new one with the fixed name
    namesByPrefix[fixedName] = names
  }

  const sortByKey = (a,b) => a[0].localeCompare(b[0])

  const handlersByRoute = Object.assign({}, ...Object.entries(namesByPrefix).sort(sortByKey).map(v => {
    const [prefix, names] = v
    const endpointName = toCamelCalse(prefix)
    const entries = Object.entries(names)
    const fileName = entries[0][1]
    return {
      ['/hwmon/' + endpointName]: entries.length > 1 ? _ => {
        const res = {}
        for (const n of entries) {
          const [name, fileName] = n
          const content = readAt(fileName)
          res[name] = parsers.generic(content)
        }
        return responses.ok(res)
      } : _ => {
        const content = readAt(fileName)
        const res = parsers.generic(content)
        return responses.ok(res)
      }
    }
  }))

  server.mapAll(handlersByRoute)
}