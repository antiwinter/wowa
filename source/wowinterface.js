const _ = require('underscore')
const g = require('got')
const x = require('x-ray')({
  filters: {
    trim(v) {
      return typeof v === 'string' ? v.trim() : v
    }
  }
})
const log = console.log

let api = {
  $url: 'https://wowinterface.com',

  info(key, done) {
    g(`${api.$url}/downloads/info${key}.html`)
      .then(res => {
        x(res.body, {
          name: '.navbar strong | trim',
          author: '#author a b',
          info: x('.tombox tr', [
            { key: '.titletext', value: '[class="alt2"]' }
          ]),
          v0: '#version',
          s0: '#size',
          version: x('table tr', [{ link: 'div a@href', info: ['td div'] }])
        })((err, d) => {
          if (err) return done()

          d.info.forEach(x => {
            if (x.key.match(/update/i))
              d.update = new Date(x.value).valueOf() / 1000
            if (x.key.match(/download/i))
              d.download = parseInt(x.value.split(',').join(''))
          })

          delete d.info

          d.version = _.filter(
            d.version,
            x => x.link && x.link.match(/\/download/)
          )
            .map(x => {
              return {
                link: api.$url + x.link,
                name: x.info[1],
                size: x.info[2]
              }
            })
            .slice(0, 10)

          x(`${api.$url}/downloads/download${key}`, '.manuallink a@href')(
            (_err, _link) => {
              log('got _link', _link)

              d.version.unshift({
                link: _link,
                name: d.v0.split(':')[1],
                size: d.s0.replace(/\(|\)/g, '')
              })

              delete d.v0
              delete d.s0

              log(JSON.stringify(d, null, 2))
              done(d)
            }
          )
        })
      })
      .catch(err => {
        done()
      })
  },

  search(text, done) {
    // log('in')
    x(api.$url + 'search?search=' + text, 'body', {
      name: ['.project-list-item h2 | trim'],
      key: ['.list-item__details a@href | tail'],
      download: ['li .count--download | num'],
      update: ['li .date--updated abbr@data-epoch | num'],
      create: ['li .date--created abbr@data-epoch | num'],
      desc: ['li .list-item__description p@title']
    })((err, d) => {
      // log('serach', text, err, d)
      done(
        err
          ? null
          : d.name.map((v, i) => {
              let z = {}
              for (let k in d) z[k] = d[k][i]
              z.url = api.$url + d.key[i]
              return z
            })
      )
    })
  }
}

module.exports = api
