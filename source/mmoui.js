const _ = require('underscore')
const Fuse = require('fuse.js')
const cfg = require('../lib/config')
const g = require('got')
const log = console.log

let api = {
  $url: 'https://api.mmoui.com/v3/game/WOW',
  $web: 'https://wowinterface.com',

  info(key, done) {
    let id = key.split('-')[0]

    log('getting', `${api.$url}/filedetails/${id}.json`)
    g(`${api.$url}/filedetails/${id}.json`)
      .then(res => {
        let x = JSON.parse(res.body)[0]

        done({
          name: x.UIName,
          author: x.UIAuthorName,
          update: x.UIDate / 1000,
          download: x.UIHitCount,
          version: [{ link: x.UIDownload, name: x.UIVersion }]
        })
      })
      .catch(x => done())
  },

  summary(done) {
    g(`${api.$url}/filelist.json`)
      .then(res => {
        let r = JSON.parse(res.body)

        // log(r[0])
        done(
          r.map(x => {
            return {
              id: x.UID,
              cat: x.UICATID,
              version: x.UIVersion,
              update: x.UIDate / 1000,
              name: x.UIName,
              author: x.UIAuthorName,
              download: x.UIDownloadTotal,
              game: x.UICompatibility
                ? _.uniq(x.UICompatibility.map(c => c.version))
                : null,
              dir: x.UIDir,
              source: 'mmoui'
            }
          })
        )
      })
      .catch(err => {
        log('mmoui summary failed', err)
      })
  },

  search(text, done) {
    let mo = cfg.getMode()
    let db = cfg.getDB()

    if (!db) return done()

    db = _.filter(
      db,
      d =>
        (mo === '_retail_' && d.cat !== '160') ||
        (mo === '_classic_' && d.cat === '160')
    )

    log(mo)

    let res = _.filter(
      db,
      d =>
        d.name.toLowerCase().search(text.toLowerCase()) >= 0 ||
        d.dir[0].toLowerCase().search(text.toLowerCase()) >= 0
    )

    res.sort((a, b) => b.download - a.download)
    res = res.slice(0, 15)

    // log(res)
    done(
      res.map(x => {
        let key = x.id + '-' + x.name.replace(/[^a-zA-Z0-9]/g, '')
        return {
          name: x.name,
          key,
          download: parseInt(x.download),
          update: x.update,
          page: `${api.$web}/downloads/info${key}.html`
        }
      })
    )
  }
}

module.exports = api
