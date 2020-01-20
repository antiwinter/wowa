const g = require('got')
const _ = require('underscore')
const cfg = require('../lib/config')
const { HttpsAgent } = require('agentkeepalive')
const log = console.log

let api = {
  $url: 'https://www.curseforge.com/wow/addons/',
  $srl: 'https://addons-ecs.forgesvc.net/api/v2/addon',

  $lcl: /(addons|projects)\/(.*)$/,
  $scl: 'curseforge.com',

  info(ad, done) {
    let flavor = cfg.getMode() === '_classic_' ? 'wow_classic' : 'wow_retail'
    let top = require('./')

    top.getDB('curse', db => {
      // log('curse info')
      if (!db) return done()

      // log('got db', db)

      let x = _.find(db, d => ad.key === d.key)

      // log('got x', x)

      if (!x) return done()

      let id = x.id

      let qs = `${api.$srl}/${id}`

      // log('getting', qs)
      g.get(qs)
        .then(res => {
          res = JSON.parse(res.body)
          // log('got', res)

          let data = {
            name: res.name,
            owner: res.authors ? res.authors[0].name : 'unknown',
            create: new Date(res.dateCreated).valueOf() / 1000,
            update: new Date(res.dateReleased).valueOf() / 1000,
            download: res.downloadCount,
            version: res.latestFiles.map(x => {
              return {
                name: x.displayName,
                size: x.fileLength,
                link: x.downloadUrl,
                flavor: x.gameVersionFlavor,
                date: new Date(x.fileDate),
                stage: x.releaseType // stage: 1 formal, 2 beta, 3 alpha (0, 4 not found)
              }
            })
          }

          if (!ad.anyway)
            data.version = _.filter(data.version, x => x.flavor === flavor)

          if (!ad.nolib)
            data.version = _.filter(data.version, x => !x.name.match(/-nolib$/))

          let beta = _.filter(data.version, x => x.stage < 3)
          if (beta) data.version = beta

          data.version.sort((a, b) => b.date - a.date)

          // log('final data', data)
          done(!data.version.length ? null : data)
        })
        .catch(err => {
          done()
        })
    })
  },

  summary(done) {
    g.get('https://github.com/antiwinter/scrap/raw/master/wowa/db-curse.json', {
      agent: new HttpsAgent({ keepAlive: true })
    })
      .then(res => {
        done(JSON.parse(res.body))
      })
      .catch(err => {
        log('githubcontent error', err)
        done()
      })
  },

  search(ad, done) {
    let flavor = cfg.getMode() === '_classic_' ? 'wow_classic' : 'wow_retail'

    let qs = `${api.$srl}/search?gameId=1&index=0&pageSize=30&searchFilter=${ad.key}`
    // log('searching', qs)
    g.get(qs)
      .then(res => {
        // log(res.body)
        let data = JSON.parse(res.body)

        if (!ad.anyway)
          data = _.filter(data, d =>
            _.find(
              d.gameVersionLatestFiles,
              _d => _d.gameVersionFlavor === flavor
            )
          )

        done(
          data.map(x => {
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
