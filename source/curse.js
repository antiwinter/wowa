const x = require('x-ray')({
  filters: {
    trim(v) {
      return typeof v === 'string' ? v.trim() : v
    },
    num(v) {
      let unit = v.split(' ')[0]
      if (unit) {
        unit = unit[unit.length - 1].toLowerCase()
        unit = unit === 'm' ? 1000000 : unit === 'k' ? 1000 : 1
      } else unit = 1
      return parseInt(v.split(',').join('')) * unit
    },
    tail(v) {
      let d = v.split('/')
      return d[d.length - 1]
    }
  }
})
const g = require('got')
const log = console.log

let api = {
  $url: 'https://www.curseforge.com/wow/addons/',
  $srl: 'https://addons-ecs.forgesvc.net/api/v2/addon/search',

  info(key, done) {
    x(api.$url + key + '/files', {
      name: 'header h2 | trim',
      owner: '.text-sm span | trim',
      create: ['div span abbr@data-epoch | num'],

      download: ['.w-full span | num'],
      version: x('tbody tr', [
        {
          name: 'a | trim',
          size: ['td | trim'],
          game: 'td div div | trim',
          link: '.button--hollow@href'
        }
      ])
    })((err, d) => {
      // log('/???', key, err, d)
      if (!d) {
        done()
        return
      }

      let tmp = d.create
      d.create = tmp[2]
      d.update = tmp[3]

      d.version.forEach(x => {
        x.link += '/file'
        x.size = x.size[2]
      })
      d.download = d.download[2]

      // log(d)

      done(err || !d.update ? null : d)
    })
  },

  search(text, done) {
    g.get(`${api.$srl}?gameId=1&index=0&pageSize=15&searchFilter=${text}`)
      .then(res => {
        // log(res.body)
        done(
          JSON.parse(res.body).map(x => {
            return {
              name: x.name,
              key: x.websiteUrl.split('/').pop(),
              download: x.downloadCount,
              update: new Date(x.dateModified).valueOf() / 1000,
              page: x.websiteUrl
            }
          })
        )
      })
      .catch(err => {
        done()
      })
  }
}

module.exports = api
