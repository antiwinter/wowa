const fs = require('fs')
const _ = require('underscore')
const rm = require('rimraf')
const async = require('async')
const path = require('path')

const cl = require('./color')
const cfg = require('./config')
const log = console.log

let w = {
  data: {},

  load() {
    let p = cfg.getPath('wowaads')

    w.data = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {}
    return w
  },

  save() {
    fs.writeFileSync(
      cfg.getPath('wowaads'),
      JSON.stringify(w.data, null, 2),
      'utf-8'
    )
  },

  checkDuplicate() {
    let keys = _.keys(w.data)
    let k

    while ((k = keys.pop())) {
      for (let i = 0; i < keys.length; i++) {
        let k2 = keys[i]
        let inc = _.intersection(w.data[k].sub, w.data[k2].sub)
        if (inc.length) {
          log(
            `\n${cl.i('Note:')} ${cl.h(k)} and ${cl.h(
              k2
            )} use the same subset of directory, make sure you have only one of them installed\n`
          )
          // log(inc)
          return true
        }
      }
    }

    return false
  },

  clearUp(key, done) {
    let p = cfg.getPath('addon')
    if (key in w.data) {
      async.forEach(
        w.data[key].sub,
        (sub, cb) => {
          rm(path.join(p, sub), err => {
            if (err) {
              log('clear up addon failed', sub)
              done(err)
              cb(false)
              return
            }

            cb()
          })
        },
        () => {
          delete w.data[key]
          done()
        }
      )
    } else if (fs.existsSync(path.join(p, key))) rm(path.join(p, key), done)
    else done('na')
  },

  dirStatus(dir) {
    for (let k in w.data) if (w.data[k].sub.indexOf(dir) >= 0) return k
  },

  unknownDirs() {
    return _.filter(
      fs.readdirSync(cfg.getPath('addon')),
      d => !/^\./.test(d) && !w.dirStatus(d)
    )
  }
}

module.exports = w
