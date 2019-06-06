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
const log = console.log

let api = {
  $url: 'http://curseforge.com/wow/addons/',
  $srl: 'https://www.curseforge.com/wow/addons/search?search=',
  info(name, done) {
    x(api.$url + name, {
      text: x('.pd-1', ['.member__name a']),
      time: x('.pd-1', ['span abbr@data-epoch | num']),
      dl: 'section .count--download | num'
    })((err, d) => {
      // log(err, d)
      let i = {
        owner: d.text[0],
        author: d.text[1],
        create: d.time[1],
        update: d.time[0],
        download: d.dl
      }

      // log(i)
      done(err ? null : i)
    })
  },

  get(name, done) {
    x(api.$url + name + '/download', '.download_box p a@href')((err, url) => {
      if (err) return done()
      done(g.stream(url))
    })
  },

  search(name, done) {
    // log('getting', api.$srl + name)
    x(api.$srl + name, 'body', {
      name: ['.project-list-item h2 | trim'],
      download: ['li .count--download | num'],
      update: ['li .date--updated abbr@data-epoch | num'],
      create: ['li .date--created abbr@data-epoch | num'],
      desc: ['li .list-item__description p@title']
    })((err, d) => {
      done(
        err
          ? null
          : d.name.map((v, i) => {
              let z = {}
              for (let k in d) z[k] = d[k][i]
              return z
            })
      )
    })
  }
}

module.exports = api

api.search('deadly', rs => log(rs))
