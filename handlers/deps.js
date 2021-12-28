import * as config from '../config.js'
import * as utils from '../utils.js'

export const register = async () => {
  const echartsUrl = config.ECHARTS_URL
  const staticsPath = utils.trimChar(config.STATIC_PATH, '/')
  const echartsFile = `${staticsPath}/echarts.js`
  let exists = false
  try {
    const file = Deno.openSync(echartsFile, { read: true })
    const stat = file.statSync()
    if (!stat.isFile) {
      throw new Error(`${file.name} is not a file`)
    }
    exists = true
  } catch (error) {
    if (error.name.toLowerCase() !== 'notfound') {
      throw error
    }
  }
  if (exists) {
    // Nothing else to do
    return
  }
  console.log('Missing echarts, downloading...')
  const response = await fetch(echartsUrl)
  const echartsContent = await response.text()
  Deno.writeTextFileSync(echartsFile, echartsContent);
  console.log(`Saved echarts to ${echartsFile}`)
}