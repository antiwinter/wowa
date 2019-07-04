const _ = require('underscore')
const g = require('got')
const x = require('x-ray')({
  filters: {
    trim(v) {
      return typeof v === 'string' ? v.trim() : v
    },
    num(v) {
      return parseInt(v.split(',').join(''))
    }
  }
})
const FormData = require('form-data')
const log = console.log

let api = {
  $url: 'https://wowinterface.com',

  info(key, done) {
    x(`${api.$url}/downloads/info${key}.html`, {
      name: '.navbar strong | trim',
      author: '#author a b',
      info: x('.tombox tr', [{ key: '.titletext', value: '[class="alt2"]' }]),
      v0: '#version',
      s0: '#size',
      version: x('table tr', [{ link: 'div a@href', info: ['td div'] }])
    })((err, d) => {
      if (err || !d.info.length) return done()

      // log('wi: d', d)
      d.info.forEach(x => {
        if (x.key.match(/update/i))
          d.update = new Date(x.value).valueOf() / 1000
        if (x.key.match(/download/i))
          d.download = parseInt(x.value.split(',').join(''))
      })

      delete d.info

      d.version = _.filter(
        d.version,
        x => x.link && x.link.match(/\/downloads\/getfile/)
      )
        .map(x => {
          return {
            link: x.link,
            name: x.info[1],
            size: x.info[2]
          }
        })
        .slice(0, 10)

      x(`${api.$url}/downloads/download${key}`, '.manuallink a@href')(
        (_err, _link) => {
          d.version.unshift({
            link: _link,
            name: d.v0.split(':')[1].trim(),
            size: d.s0.replace(/\(|\)/g, '')
          })

          delete d.v0
          delete d.s0

          // log(JSON.stringify(d, null, 2))
          done(d)
        }
      )
    })
  },

  search(text, done) {
    let form = new FormData()

    form.append('x', '0')
    form.append('y', '0')
    form.append('search', text)

    g.post(`${api.$url}/downloads/search.php`, {
      body: form
    })
      .then(res => {
        // log('search got', res.body)

        x(
          res.body,
          x('.tborder tr', [
            { info: ['td a | trim'], txt: ['td'], ref: ['td a@href'] }
          ])
        )((err, d) => {
          if (err) return done()

          // log('got d', d)
          let data = []

          d.forEach(x => {
            if (x.ref.length !== 3) return

            let key =
              x.ref[0].split('=').pop() +
              '-' +
              x.info[0].replace(/ |\(|\)|,/g, '')
            let item = {
              name: x.info[0],
              key,
              download: parseInt(x.txt[4].split(',').join('')),
              update: new Date(x.txt[5]).valueOf() / 1000,
              desc: 'no description avaiable',
              page: `${api.$url}/downloads/info${key}.html`
            }

            data.push(item)
          })

          // log(data)
          data.sort((a, b) => b.download - a.download)
          done(data)
        })
      })
      .catch(err => {
        log('???', err)
        done()
      })
  }
}

module.exports = api
