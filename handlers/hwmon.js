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

  // Try to 'normalize' up some names in favor of their labels
  const endsWithDigit = /.*[0-9]/
  const digits = /[0-9]/

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

  for (const [prefix, names] of Object.entries(namesByPrefix)) {
    if (!endsWithDigit.test(prefix)) {
      continue
    }
    const fixedPrefix = prefix.substring(0, prefix.search(digits))
    let content
    if (names.label) {
      content = readAt(names.label)
    } else {
      // Invent it a label if it doesn't has one
      content = ''
    }
    if (names[prefix]) {
      // Fix pwm1 to value, since it doesn't has a _something for its value just pwm1
      names.value = names[prefix]
      delete names[prefix]
    }
    if (names.length <= 1) {
      continue
    }
    const fixedName = toCamelCalse(`${fixedPrefix}_${content}`)
    // Delete previous mapping, no need for the label anymore
    delete namesByPrefix[prefix]
    delete names.label
    // Create new one with the fixed name
    namesByPrefix[fixedName] = names
  }

  const handlers = Object.entries(namesByPrefix).map(([prefix, names]) => {
    const entries = Object.entries(names).map(([name, fileName]) => ({
      parser: parsers.generic,
      name: name,
      fileName: fileName
    }))
    return {
      parser: parsers.generic,
      name: prefix,
      entries: entries.length > 1 ? entries : [],
      fileName: entries.length > 1 ? '' : entries[0].fileName
    }
  })

  const handlersByRoute = Object.assign({}, ...handlers.map(v => {
    const { parser, fileName, entries } = v
    return {
      ['/hwmon/' + v.name]: entries.length > 1 ? _ => {
        const res = {}
        for (const e of entries) {
          const content = readAt(e.fileName)
          const parsed = e.parser(content)
          res[e.name] = parsed
        }
        return responses.ok(res)
      } : _ => {
        const content = readAt(fileName)
        const res = parser(content)
        return responses.ok(res)
      }
    }
  }))

  // Generic route to get everything
  handlersByRoute['/hwmon/all'] = _ => {
    const res = {}
    for (const v of handlers) {
      if (v.entries.length <= 1) {
        const content = readAt(v.fileName)
        const parsed = v.parser(content)
        res[v.name] = parsed
        continue
      }
      const tmp = res[v.name] = {}
      for (const e of v.entries) {
        const content = readAt(e.fileName)
        const parsed = e.parser(content)
        tmp[e.name] = parsed
      }
    }
    return responses.ok(res)
  }

  server.mapAll(handlersByRoute)
}