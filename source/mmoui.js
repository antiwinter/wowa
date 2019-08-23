const _ = require('underscore')
const cfg = require('../lib/config')
const g = require('got')
const log = console.log

let api = {
  $url: 'https://api.mmoui.com/v3/game/WOW',
  $web: 'https://wowinterface.com',

  info(ad, done) {
    let id = ad.key.split('-')[0]

    // log('getting', `${api.$url}/filedetails/${id}.json`)
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
              name: x.UIName,
              key: x.UID + '-' + x.UIName.replace(/[^a-zA-Z0-9]/g, ''),
              mode: x.UICATID === '160' ? '_classic_' : '_retail_',
              cat: x.UICATID,
              version: x.UIVersion,
              update: x.UIDate / 1000,
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

  search(ad, done) {
    let mo = cfg.getMode()
    let db = cfg.getDB()

    if (!db) return done()

    if (!ad.anyway) db = _.filter(db, d => mo === d.mode)

    // log(mo)

    let res = _.filter(
      db,
      d =>
        d.name.toLowerCase().search(ad.key.toLowerCase()) >= 0 ||
        d.dir[0].toLowerCase().search(ad.key.toLowerCase()) >= 0
    )

    res.sort((a, b) => b.download - a.download)
    res = res.slice(0, 15)

    // log(res)
    done(
      res.map(x => {
        return {
          name: x.name,
          key: x.key,
          download: parseInt(x.download),
          update: x.update,
          page: `${api.$web}/downloads/info${x.key}.html`
        }
      })
    )
  }
}

module.exports = api
