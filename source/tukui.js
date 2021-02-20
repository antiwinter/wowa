const _ = require('underscore')
const cfg = require('../lib/config')
const g = require('got')
const log = console.log

let api = {
  $url: 'https://www.tukui.org',
  $base: 'https://www.tukui.org/download.php',

  $lcl: /\?id=(.*)$/,
  $fcl: 'tukui',
  $scl: 'tukui.com',

  info(ad, done) {
    let id = ad.key.split('-')[0]
    let mo = cfg.getMode()
    let top = require('./')

    if (mo === '_retail_' && ad.key.match(/0-.tukui|0-.elvui/i)) {
      g(`${api.$base}?ui=${ad.key.match(/0-.tukui/i) ? 'tukui' : 'elvui'}`)
        .then(res => {
          let i = {
            name: ad.key,
            author: 'tukui.org',
            download: 1000000,
            version: [{}]
          }

          res.body
            .replace(/\r/g, '')
            .split('\n')
            .forEach(line => {
              if (line.match(/current version/i)) {
                let d = line.replace(/</g, '>').split('>')
                i.update = new Date(d[6]) / 1000
                i.version[0].name = d[2]
              }

              if (line.match(/btn-mod/i)) {
                i.version[0].link = api.$url + line.split('"')[1]
              }
            })

          done(i)
        })
        .catch(x => done())
      return
    }

    top.getDB('tukui', db => {
      if (!db) return done()

      let x = _.find(db, d => ad.key === d.key)
      if (!x) return done()

      done({
        name: x.name,
        author: x.author,
        update: x.update,
        download: x.download,
        version: [{
          name: x.version,
          game: x.game,
          link: `${api.$url}/${mo === '_retail_'
            ? 'addons' : 'classic-addons'}.php?download=${x.id}`
        }]
      })
    })
  },

  summary(done) {
    // inject the base UI
    let r = [
      {
        id: 0,
        name: 'TukUI',
        downloads: 1000000,
        lastupdate: new Date().toDateString(),
        small_desc: 'TukUI',
      },
      {
        id: 0,
        name: 'ElvUI',
        downloads: 1000000,
        lastupdate: new Date().toDateString(),
        small_desc: 'ElvUI',
      }
    ]

    // get retail addon list
    g(`${api.$url}/api.php?addons`).then(res => {
      r = r.concat(JSON.parse(res.body))
      r.forEach(x => x.mode = 1)

      // get classic addon list
      g(`${api.$url}/api.php?classic-addons`).then(res => {
        r = r.concat(JSON.parse(res.body).map(x => {
          x.mode = 2
          return x
        }))

        done(r.map(x => {
          return {
            id: x.id,
            name: x.name,
            key: x.id + '-' + x.mode + x.name.replace(/[^a-zA-Z0-9]/g, ''),
            mode: x.mode,
            version: x.version,
            update: new Date(x.lastupdate).valueOf() / 1000,
            author: x.author,
            download: x.downloads,
            small_desc: x.small_desc,
            source: 'tukui'
          }
        }))
      })
    }).catch(err => {
      log('tukui summary failed', err)
      done([])
    })
  },

  search(ad, done) {
    let mo = cfg.getMode() === '_retail_' ? 1 : 2
    let top = require('./')

    top.getDB('tukui', db => {
      let res = _.filter(db, x => x.mode === mo && (
        x.name.toLowerCase().search(ad.key.toLowerCase()) >= 0 ||
        x.small_desc.toLowerCase().search(ad.key.toLowerCase()) >= 0
      ))

      res.sort((a, b) => b.downloads - a.downloads)
      res = res.slice(0, 15)

      done(
        res.map(x => {
          x.page = `${api.$url}/${mo === 1
            ? 'addons' : 'classic-addons'}.php?id=${x.id}`
          return x
        })
      )
    })
  }
}

module.exports = api
