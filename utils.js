const NAME_SEPARATOR = '_'
const PATH_SEPARATOR = '/'
export const toCamelCalse = v => {
  if (v.indexOf(NAME_SEPARATOR) < 0) {
    // No separators present
    return v
  }
  const parts = v.split(NAME_SEPARATOR)
  let finalName = parts[0]
  for (let i = 1; i < parts.length; ++i) {
    const part = parts[i]
    // First uppercase, rest as-is
    const first = part[0].toUpperCase()
    finalName += first + part.slice(1)
  }
  return finalName
}

export const ignoreDigits = (v, d) => {
  // Ugly
  return Number.parseFloat(v.toFixed(d || 2))
}

export const trimSeparator = p => trimChar(p, PATH_SEPARATOR)
export const separatorEnd = p => trimSeparator(p) + PATH_SEPARATOR

export const trimChar = (str, ch) => {
  let start = 0
  while (start < str.length && str[start] === ch) {
    ++start
  }
  let end = str.length
  if(start < str.length) {
    while (end > start && str[end - 1] === ch) {
      --end
    }
  }
  if (start > 0 || end < str.length) {
    return str.substring(start, end)
  }
  return str;
}