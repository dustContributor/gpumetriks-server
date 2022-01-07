class App {
  static #utils = Object.freeze({
    padZeroes: v => v.toString().padStart(2, '0'),
    formatTstamp: v => App.utils.padZeroes(v.getHours()) +
      ':' + App.utils.padZeroes(v.getMinutes()) +
      ':' + App.utils.padZeroes(v.getSeconds()),
    template: content => new Function('self', ('return `' + content + '`').replaceAll(/(\r\n|\n|\r)/gm, '')),
    el: Object.freeze({
      at: id => document.querySelector('#' + id),
      templateAt: id => App.utils.template(App.utils.el.at(id).innerHTML)
    })
  })
  static get utils() { return App.#utils }
  constructor() {
  }
  start() {
    const apisByName = {
      sclk: 'gpu/ppDpmSclk',
      mclk: 'gpu/ppDpmMclk',
      fclk: 'gpu/ppDpmFclk',
      dceclk: 'gpu/ppDpmDcefclk',
      socclk: 'gpu/ppDpmSocclk',
    }
    const $mainChart = App.utils.el.at('main-chart')
    const tooltipTmpl = App.utils.el.templateAt('tooltip-template')
    const tooltipRowTmpl = App.utils.el.templateAt('tooltip-row-template')

    const REFRESH_RATE = 1000
    const MAX_SAMPLES = 500
    const mainChart = echarts.init($mainChart);
    const series = Object.keys(apisByName).sort().map(v => ({
      data: [],
      name: v,
      key: v,
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

    setInterval(() => Promise.all(series.map(v => fetch(apisByName[v.key])))
      .then(v => Promise.all(v.map(v => v.json())))
      .then(v => {
        const now = new Date()
        for (let i = 0; i < v.length; ++i) {
          const serie = series[i]
          const sample = v[i]
          const current = sample.find(e => e.isCurrent)
          serie.data.push({
            name: serie.name,
            value: [
              now,
              current.value,
              current.unit
            ]
          })
          if (serie.data.length > MAX_SAMPLES) {
            serie.data.shift()
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