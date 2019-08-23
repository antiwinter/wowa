const _ = require('underscore')
const cfg = require('../lib/config')
const g = require('got')
const log = console.log

let api = {
  $url: 'https://www.tukui.org/api.php',
  $web: 'https://www.tukui.org/download.php?ui=tukui',

  info(ad, done) {
    let id = ad.key.split('-')[0]
    let mo = cfg.getMode()

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

      res = _.filter(
        res,
        d =>
          d.name.toLowerCase().search(ad.key.toLowerCase()) >= 0 ||
          d.small_desc.toLowerCase().search(ad.key.toLowerCase()) >= 0
      )

      res.sort((a, b) => b.downloads - a.downloads)

      res.unshift({})

      res = res.slice(0, 15)

      // log(res)
      done(
        res.map(x => {
          return {
            name: x.name,
            key: x.id + '-' + x.name.replace(/[^a-zA-Z0-9]/g, ''),
            download: parseInt(x.download),
            update: x.update,
            page: `${api.$web}/downloads/info${x.key}.html`
          }
        })
      )
    })
  }
}

module.exports = api
