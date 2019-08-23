const _ = require('underscore')
const cfg = require('../lib/config')
const g = require('got')
const log = console.log

let api = {
  $url: 'https://www.tukui.org/api.php',
  $web: 'https://www.tukui.org/download.php',

  info(ad, done) {
    let id = ad.key.split('-')[0]
    let mo = cfg.getMode()

    if (mo === '_retail_' && ad.key.match(/0-tukui|0-elvui/i)) {
      g(`${api.$web}?ui=${ad.key.match(/0-tukui/i) ? 'tukui' : 'elvui'}`)
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
                i.version[0].link = 'https://www.tukui.org' + line.split('"')[1]
              }
            })

          done(i)
        })
        .catch(x => done())
      return
    }

    // log('getting', `${api.$url}/filedetails/${id}.json`)
    g(`${api.$url}?${mo === '_retail_' ? 'addon' : 'classic-addon'}=${id}`)
      .then(res => {
        let x = JSON.parse(res.body)

        done({
          name: x.name,
          author: x.author,
          update: new Date(x.lastupdate).valueOf() / 1000,
          download: x.downloads,
          version: [
            {
              name: x.version,
              game: x.patch,
              link: x.url
            }
          ]
        })
      })
      .catch(x => done())
  },

  search(ad, done) {
    let mo = cfg.getMode()

    g(
      `${api.$url}?${mo === '_retail_' ? 'addons' : 'classic-addons'}=all`
    ).then(res => {
      res = JSON.parse(res.body)

      // log(res)
      // retail version will not show in api results
      if (mo === '_retail_')
        res = res.concat([
          {
            id: 0,
            name: 'TukUI',
            small_desc: 'TukUI',
            downloads: 1000000,
            lastupdate: new Date().valueOf(),
            web_url: api.$web + '?ui=tukui'
          },
          {
            id: 0,
            name: 'ElvUI',
            small_desc: 'ElvUI',
            downloads: 1000000,
            lastupdate: new Date().valueOf(),
            web_url: api.$web + '?ui=elvui'
          }
        ])

      res = _.filter(
        res,
        d =>
          d.name.toLowerCase().search(ad.key.toLowerCase()) >= 0 ||
          d.small_desc.toLowerCase().search(ad.key.toLowerCase()) >= 0
      )

      res.sort((a, b) => b.downloads - a.downloads)

      res = res.slice(0, 15)

      // log(res)
      done(
        res.map(x => {
          return {
            name: x.name,
            key: x.id + '-' + x.name.replace(/[^a-zA-Z0-9]/g, ''),
            download: parseInt(x.downloads),
            update: new Date(x.lastupdate).valueOf() / 1000,
            page: x.web_url
          }
        })
      )
    })
  }
}

module.exports = api
