const log = console.log
const async = require('async')
const cfg = require('../lib/config')
const _ = require('underscore')

let src = {
  $api: {
    curse: require('./curse'),
    mmoui: require('./mmoui'),
    tukui: require('./tukui'),
    github: require('./github')
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
    let t
    let d = {
      source: name.match(/:/)
        ? ((t = name.split(':')), (name = t[1]), t[0])
        : name.match(/\//)
        ? 'github'
        : undefined,
      version: name.split('@')[1],
      key: name.split('@')[0]
    }

    if (!d.source && name.match(/tukui|elvui/)) d.source = 'tukui'
    if (d.source in { wowi: 1, wowinterface: 1 }) d.source = 'mmoui'

    if (d.source === 'github') {
      let sp = d.key.split('/')
      if (sp.length > 2) {
        d.branch = sp.pop()
        d.key = sp.join('/')
      }
    }

    d.anyway = cfg.anyway()
    return d
  },

  info(ad, done) {
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
    src.$api.mmoui.summary(done)
  }
}

module.exports = src
