const g = require('got')
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

const fs = require('fs')
const dec = require('decompress')
const unzip = require('decompress-unzip')
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

  get(name, path, cb) {
    x(api.$url + name + '/download', '.download_box p a@href')((err, url) => {
      if (err) {
        log(err)
        return cb()
      }

      if (path[path.length - 1] !== '/') throw 'path must end with a /'

      let src = path + '1.zip'
      let dst = path + 'dec'
      
      g.stream(url)
        .on('downloadProgress', evt => {
          // log('download', evt)
          cb(evt)
        })
        .on('end', () => {
          dec(src, dst, {
            plugins: [unzip()]
          }).then(() => {
            cb('done')
          })
        })
        .pipe(fs.createWriteStream(src))
    })
  },

  search(name, done) {
    // log('getting', api.$srl + name)
    x(api.$srl + name, 'body', {
      name: ['.project-list-item h2 | trim'],
      key: ['.project-list-item a@href | tail'],
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
