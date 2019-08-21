const fs = require('fs')
const _ = require('underscore')
const cfg = require('./config')

let w = {
  data: {},

  load() {
    let jsp = cfg.getPath('wowaads')
    if (fs.existsSync(jsp)) {
      w.data = JSON.parse(fs.readFileSync(jsp, 'utf-8'))
    }
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
    if (key in w.data) {
      async.forEach(
        w.data[key].sub,
        (sub, cb) => {
          rm(path.join(cfg.getPath('addon'), sub), err => {
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
    }

    done()
  },

  dirStatus(dir) {
    for (let k in w.data) if (w.data[k].sub.indexOf(dir) >= 0) return k
  }
}

module.exports = w
