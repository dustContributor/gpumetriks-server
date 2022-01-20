class App {
  static #deepFreeze = v => {
    switch (typeof v) {
      case 'object':
        for (const k in v) {
          v[k] = this.#deepFreeze(v[k])
        }
        break
      case 'array':
        for (let i = 0; i < v.length; ++i) {
          v[i] = this.#deepFreeze(v[i])
        }
        break
    }
    return Object.freeze(v)
  }
  static #types = App.#deepFreeze({

  })
  static #utils = App.#deepFreeze({
    deepFreeze: App.#deepFreeze,
    padZeroes: v => v.toString().padStart(2, '0'),
    formatTstamp: v => App.utils.padZeroes(v.getHours()) +
      ':' + App.utils.padZeroes(v.getMinutes()) +
      ':' + App.utils.padZeroes(v.getSeconds()),
    template: content => new Function('self', ('return `' + content + '`').replaceAll(/(\r\n|\n|\r)/gm, '')),
    el: {
      at: id => document.querySelector('#' + id),
      templateAt: id => App.utils.template(App.utils.el.at(id).innerHTML)
    }
  })
  static get utils() { return App.#utils }
  static get types() { return App.#types }
  constructor() {
  }
  start() {
    const groupsByName = {
      'clk': { axis: 0 },
      // 'mem' : { axis: 0 },
      'fan': { axis: 1 },
      'pwm': { axis: 1 },
      'tmp': { axis: 1 },
    }
    const apis = []
    apis.at = (type, name, base, path) => (apis.push({
      label: name,
      type: type,
      group: base,
      route: `${base}/${path}`,
      name: path,
      axis: groupsByName[type].axis
    }) && apis)
    apis.end = () => delete apis.at && delete apis.end && apis
    App.utils.deepFreeze(apis
      .at('clk', 'sclk', 'gpu', 'ppDpmSclk')
      .at('clk', 'mclk', 'gpu', 'ppDpmMclk')
      .at('clk', 'fclk', 'gpu', 'ppDpmFclk')
      .at('clk', 'dceclk', 'gpu', 'ppDpmDcefclk')
      .at('clk', 'socclk', 'gpu', 'ppDpmSocclk')
      // .at('mem', 'gtt', 'gpu', 'memInfoGttUsed')
      // .at('mem', 'visvram', 'gpu', 'memInfoVisVramUsed')
      // .at('mem', 'vram', 'gpu', 'memInfoGttUsed')
      .at('fan', 'fan', 'hwmon', 'fan')
      .at('pwm', 'pwm', 'hwmon', 'pwm')
      .at('tmp', 'edge', 'hwmon', 'tempEdge')
      .at('tmp', 'junc', 'hwmon', 'tempJunction')
      .at('tmp', 'mem', 'hwmon', 'tempMem')
      .end())

    const $mainChart = App.utils.el.at('main-chart')
    const tooltipTmpl = App.utils.el.templateAt('tooltip-template')
    const tooltipRowTmpl = App.utils.el.templateAt('tooltip-row-template')

    const REFRESH_RATE = 1000
    const MAX_SAMPLES = 500
    const mainChart = echarts.init($mainChart);
    const series = apis.map(v => ({
      data: [],
      name: v.label,
      key: v.name,
      type: 'line',
      showSymbol: false
    }))
    const option = {
      title: {
        text: ''
      },
      tooltip: {
        trigger: 'axis',
        formatter: v => tooltipTmpl({
          rowTmpl: tooltipRowTmpl,
          v: v
        }),
        axisPointer: {
          animation: false
        }
      },
      dataZoom: [
        {
          type: 'slider'
        },
        {
          type: 'inside'
        }
      ],
      grid: {
        bottom: 80
      },
      xAxis: {
        type: 'time',
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        splitLine: {
          show: false
        }
      },
      series: series
    }
    mainChart.setOption(option)
    const apisByGroup = apis.reduce((prev, curr) =>
      (prev[curr.group] = (prev[curr.group] || [])).push(curr) && prev, {})
    const apisByName = apis.reduce((prev, curr) => (prev[curr.name] = curr) && prev, {})
    const seriesByName = series.reduce((prev, curr) => (prev[curr.key] = curr) && prev, {})
    setInterval(() => Promise.all(
      Object.keys(apisByGroup).map(
        k => fetch(`${k}/group`, {
          method: 'POST',
          body: JSON.stringify({
            items: apisByGroup[k].map(v => v.name)
          })
        })
      )
    )
      .then(v => Promise.all(v.map(v => v.json())))
      .then(v => {
        const now = new Date()
        for (const res of v) {
          for (const name in res) {
            const api = apisByName[name]
            const serie = seriesByName[name]
            const sample = res[name]
            switch (api.type) {
              case 'clk':
                const current = sample.find(e => e.isCurrent)
                serie.data.push({
                  name: serie.name,
                  value: [
                    now,
                    current.value,
                    current.unit
                  ]
                })
                break
              case 'mem':
                break
              case 'fan':
                break
              case 'pwm':
                break
            }
            if (serie.data.length > MAX_SAMPLES) {
              serie.data.shift()
            }
          }
        }
        mainChart.setOption({
          series: series.map(v => ({
            data: v.data
          }))
        })
      }), REFRESH_RATE)
  }
}