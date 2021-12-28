import * as parsers from '../parsers.js'
import * as config from '../config.js'
import * as responses from '../responses.js'
import * as utils from '../utils.js'
import { toCamelCalse } from '../utils.js'

export const register = server => {
  const cardsPath = utils.trimChar(config.CARD_PATH, '/')
  const baseDir = `/${cardsPath}/device/`

  const ignored = new Set([
    'uevent',
    'hdcp_srm',
    'gpu_metrics',
    'pp_features',
    'pp_table',
    'local_cpus',
    'class',
    'numa_node',
    'resource',
    'aer_dev_nonfatal',
    'local_cpulist',
    'aer_dev_correctable',
    'pp_power_profile_mode', // table
    'pp_od_clk_voltage',
    'config',
    'aer_dev_fatal',
    'modalias',
    'vbios_version',
    'product_number',
    'subsystem_vendor',
    'thermal_throttling_logging',
    'pp_force_state',
    'vbios_version',
    'consistent_dma_mask_bits',
    'irq',
    'd3cold_allowed',
    'driver_override',
    'msi_bus',
    'vendor',
    'dma_mask_bits',
    'subsystem_device',
    'product_name',
    'serial_number',
    'revision'
  ])

  const parsersByName = {
    'mem_info_vram_used': parsers.memory,
    'mem_info_vis_vram_used': parsers.memory,
    'mem_info_vis_vram_total': parsers.memory,
    'mem_info_gtt_used': parsers.memory,
    'mem_info_vram_total': parsers.memory,
    'mem_info_gtt_total': parsers.memory,
    'pp_dpm_mclk': parsers.clocks,
    'pp_dpm_dcefclk': parsers.clocks,
    'pp_dpm_socclk': parsers.clocks,
    'pp_dpm_fclk': parsers.clocks,
    'pp_dpm_sclk': parsers.clocks
  }

  const names = []
  const readAt = name => Deno.readTextFileSync(baseDir + name).trim()

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

  const parserFor = v => parsersByName[v] || parsers.generic

  const handlersByRoute = Object.assign({}, ...names.sort().map(name => {
    const parser = parserFor(name)
    const endpointName = toCamelCalse(name)
    return {
      ['/gpu/' + endpointName]: _ => {
        const content = readAt(name)
        const res = parser(content)
        return responses.ok(res)
      }
    }
  }))

  // Generic route for all clocks at once
  const clocks = names.filter(v => v.endsWith('clk')).map(v => ({
    parser: parserFor(v),
    fileName: v,
    name: toCamelCalse(v)
  }))
  handlersByRoute['/gpu/clocks'] = _ => {
    const res = {}
    for (const v of clocks) {
      const content = readAt(v.fileName)
      const parsed = v.parser(content)
      res[v.name] = parsed
    }
    return responses.ok(res)
  }

  server.mapAll(handlersByRoute)
}