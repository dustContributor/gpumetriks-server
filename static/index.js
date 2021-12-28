class App {
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

    const padZeroes = v => v.toString().padStart(2, '0')
    const formatTstamp = v => padZeroes(v.getHours()) +
      ':' + padZeroes(v.getMinutes()) +
      ':' + padZeroes(v.getSeconds())
    const tooltipRow = v => `<span style='background-color:${v.color}'></span><label>${v.name} - ${v.value[1] + v.value[2]}</label>`

    const REFRESH_RATE = 1000
    const MAX_SAMPLES = 500
    const $mainChart = document.querySelector('#main-chart')
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
        text: 'Dynamic Data & Time Axis'
      },
      tooltip: {
        trigger: 'axis',
        formatter: pars => {
          return `<div class='clocks-tooltip'><label>${formatTstamp(pars[0].value[0])}</label><br>${pars.map(tooltipRow).join('<br>')}</div>`
            
        },
        axisPointer: {
          animation: false
        }
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
          series: series
        });
      }), REFRESH_RATE)
  }
}