const x = require('x-ray')({
  filters: {
    trim(v) {
      return typeof v === 'string' ? v.trim() : v
    },
    num(v) {
      return parseInt(v.split(',').join(''))
    },
    tail(v) {
      let d = v.split('/')
      return d[d.length - 1]
    }
  }
})
const log = console.log

let api = {
  $url: 'https://www.curseforge.com/wow/addons/',

  info(key, done) {
    x(api.$url + key + '/files', {
      name: 'header h2 | trim',
      owner: '.text-sm span | trim',
      create: ['div span abbr@data-epoch'],
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
      d.create = parseInt(tmp[2])
      d.update = parseInt(tmp[3])
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
              z.page = api.$url + d.key[i]
              return z
            })
      )
    })
  }
}

module.exports = api
