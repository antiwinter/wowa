const fs = require('fs')
const path = require('path')
const async = require('async')
const _ = require('underscore')
const mk = require('mkdirp')
const cfg = require('../lib/config')
const cl = require('../lib/color')
const log = console.log

let src = {
  $api: {
    curse: require('./curse'),
    mmoui: require('./mmoui'),
    tukui: require('./tukui'),
    github: require('./github'),
    git: require('./git')
  },

  $valid(ad) {
    if (ad.source && !src.$api[ad.source]) {
      log(`\nInvalid source: ${ad.source}, use one of below instead:`)
      log(
        _.keys(src.$api)
          .map(x => `  ${x}`)
          .join('\n')
      )
      return false
    }

    return true
  },

  parseName(name) {
    let t = name
    let d = {}

    if (name.match(/@/)) {
      t = name.split('@')
      d.version = t[1]
      t = t[0]
    }

    for (let k in src.$api) {
      if (t.match(/:\/\//)) {
        // looks like an long uri
        let r = src.$api[k].$lcl.exec(t)
        // log('long clue exec:', r)

        d.uri = t
        d.key = t

        if (r) {
          d.source = k
          d.key = r[r.length - 1]
          break
        }
      } else {
        // treat as short uri
        let s = null
        let z = t.split(':')
        if (z.length > 1) s = z.shift()
        d.key = z[0]

        let f = src.$api[k].$fcl
        if (!s && f && d.key.search(f) >= 0) {
          d.source = k
          break
        } else if (s && src.$api[k].$scl.search(s) >= 0) {
          d.source = k
          break
        }
      }
    }

    d.anyway = cfg.anyway()
    return d
  },

  info(ad, done) {
    // log('\n\ngetting info', ad, '\n\n')
    if (!src.$valid(ad)) return done()

    async.eachOfLimit(
      src.$api,
      1,
      (api, source, cb) => {
        if (ad.source && source !== ad.source) return cb()
        if (!ad.source && source === 'github') return cb()

        let res = null
        // log('iter', source)
        api.info(ad, info => {
          if (info && info.version.length) {
            res = info
            res.source = source
            // log('g info', info)

            if (source === 'git') {
              if (!ad.version) ad.version = 'master'
              ad.branch = ad.version

              let target = _.find(info.version, x => x.name === ad.branch)
              if (!target) {
                log(
                  `\n${cl.i2(ad.branch)} is not a valid entry for ${cl.h(
                    ad.uri
                  )}`
                )
                log(
                  'Valid entries:',
                  res.version
                    .map(x => cl.i2(x.name))
                    .slice(0, 10)
                    .join(', '),
                  '\n'
                )
                done()
              } else {
                res.hash = target.hash
              }
            }
            done(res)
            cb(false)
          } else cb()
        })
      },
      () => {
        done()
      }
    )
  },

  search(ad, done) {
    if (!src.$valid(ad)) return done()

    async.eachOfLimit(
      src.$api,
      1,
      (api, source, cb) => {
        if (!api.search) return cb()
        if (ad.source && source !== ad.source) return cb()

        // log('searching', source)
        let res = null
        // log('searching', source)
        api.search(ad, data => {
          if (data && data.length) {
            res = { source, data }
            done(res)
            cb(false)
          } else cb()
        })
      },
      () => {
        done()
      }
    )
  },

  summary(done) {
    let db = []
    src.$api.curse.summary(d => {
      db = db.concat(d)
      src.$api.mmoui.summary(d => {
        db = db.concat(d)
        done(db)
      })
    })
  },

  getDB(filter, done) {
    let p = cfg.getPath('db')

    if (!done) {
      done = filter
      filter = null
    }

    let _done = db => {
      done(filter ? _.filter(db, d => d.source === filter) : db)
    }

    if (
      !fs.existsSync(p) ||
      new Date() - fs.statSync(p).mtime > 24 * 3600 * 1000 ||
      !done // force update
    ) {
      mk(path.dirname(p), err => {
        process.stdout.write(cl.i('\nUpdating database...'))
        src.summary(s => {
          fs.writeFileSync(p, JSON.stringify(s), 'utf-8')
          log(cl.i('done'))
          if (done) _done(s)
        })
      })

      return
    }

    _done(fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null)
    return
  }
}

module.exports = src
