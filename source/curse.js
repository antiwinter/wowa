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
      text: x('.pd-1', ['.member__name a']),
      time: x('.pd-1', ['span abbr@data-epoch | num']),
      name: '.project-header__details h2',
      download: 'section .count--download | num',
      version: ['td .full'],
      size: ['td .file__size'],
      game: ['td .version__label'],
      link: ['.project-file__actions .button--download@href']
    })((err, d) => {
      // log('/???', key, err, d)
      if (!d) {
        done()
        return
      }

      let i = {
        name: d.name,
        owner: d.text[0],
        author: d.text[1],
        create: d.time[1],
        update: d.time[0],
        page: api.$url + key,
        download: d.download,
        version: []
      }

      d.version.forEach((v, j) => {
        i.version.push({
          name: v,
          size: d.size[j],
          game: d.game[j],
          link: d.link[j] + '/file'
        })
      })

      // log(i)

      done(err || !i.update ? null : i)
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
