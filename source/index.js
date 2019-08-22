const log = console.log
const async = require('async')

let src = {
  $api: {
    curse: require('./curse'),
    mmoui: require('./mmoui'),
    github: require('./github')
  },

  $valid(ad) {
    if (ad.source && !src.$api[ad.source]) {
      log(ad.source, 'is not a valid source, use one of below instead:')
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

    if (d.source && d.source !== 'github' && d.source !== 'curse')
      d.source = 'mmoui'
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
        api.info(ad.key, info => {
          if (info) {
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

    async.eachOfLimit(src.$api, 1, (api, source, cb) => {
      if (!api.search) return cb()
      if (ad.source && source !== ad.source) return cb()

      // log('searching', source)
      let res = null
      // log('searching', source)
      api.search(
        ad.key,
        data => {
          if (data && data.length) {
            res = { source, data }
            done(res)
            cb(false)
          }
        },
        () => {
          done()
        }
      )
    })
  },

  summary(done) {
    src.$api.mmoui.summary(done)
  }
}

module.exports = src
