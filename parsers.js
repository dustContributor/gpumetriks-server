import * as utils from './utils.js'

export const memory = v => {
  const b = Number.parseInt(v)
  const res = {
    b: b
  }
  if (!Number.isNaN(b) && b > 0) {
    const kb = b / 1024.0
    if (kb < 1024 && kb >= 0.01) {
      res.kb = utils.ignoreDigits(kb)
    }
    const mb = kb / 1024.0
    if (mb < 1024 && mb >= 0.01) {
      res.mb = utils.ignoreDigits(mb)
    }
    const gb = mb / 1024.0
    if (gb >= 0.01) {
      res.gb = utils.ignoreDigits(gb)
    }
  }
  return res
}

export const clocks = v => v.split('\n').map(l => {
  const parts = l.split(':')
  if (parts.length != 2) {
    throw `unexpected parts length ${parts.length}`
  }
  const res = {
    index: Number.parseInt(parts[0].trim()),
    value: parts[1].trim(),
    unit: '',
    isCurrent: false
  }
  const freq = res.value.replace('*', '').trimEnd()
  // Ugly check to see if it's the selected one
  if (freq.length != res.value.length) {
    res.value = freq
    res.isCurrent = true
  }
  // Check for units at the end
  if(freq.length > 3) {
    res.unit = freq.slice(-3)
    res.value = freq.substring(0, freq.length - 3)
    const parsedValue = Number.parseInt(res.value)
    if(!Number.isNaN(parsedValue)) {
      res.value = parsedValue
    }
  }
  return res;
})


export const generic = v => {
  const num = Number.parseFloat(v)
  return Number.isNaN(num) ? v : num
}