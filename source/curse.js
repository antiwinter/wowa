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
const _ = require('underscore')
const cfg = require('../lib/config')
const log = console.log

let api = {
  $url: 'https://www.curseforge.com/wow/addons/',
  $srl: 'https://addons-ecs.forgesvc.net/api/v2/addon/search',

  info(ad, done) {
    let mo = cfg.getMode()
    let url = api.$url + ad.key + '/files/all'

    if (!ad.anyway)
      url += `?filter-game-version=1738749986:${
        mo === '_retail_' ? '517' : '67408'
      }`

    x(url, {
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
      // log('/???', ad.key, err, d)
      if (!d) {
        done()
        return
      }

      let tmp = d.create
      d.create = tmp[1]
      d.update = tmp[2]

      d.version.forEach(x => {
        x.link += '/file'
        x.size = x.size[2]
      })
      d.download = d.download[2]

      // log(d)
      done(err || !d.update || d.version.length === 0 ? null : d)
    })
  },

  search(ad, done) {
    let mo = cfg.getMode()

    let qs = `${api.$srl}?gameId=1&index=0&pageSize=15&searchFilter=${ad.key}`

    if (mo === '_classic_' && !ad.anyway)
      qs += `&gameVersion=${cfg.getGameVersion()}`

    // log('searching', qs)
    g.get(qs)
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
