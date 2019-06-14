const log = console.log
const async = require('async')

let src = {
  $api: {
    curse: require('./curse')
  },

  info(ad, done) {
    if (ad.source && !src.$api[ad.source]) {
      log(ad.source, 'is not a valid source, use one of below instead:')
      log(
        _.keys(src.$api)
          .map(x => `  ${x}`)
          .join('\n')
      )
      return done()
    }

    async.eachOfLimit(
      src.$api,
      1,
      (api, source, cb) => {
        if (ad.source && source !== ad.source) return cb()

        let res = null
        api.info(ad.key, info => {
          if (info) {
            res = info
            res.source = source
            // log('g info', info)
            done(res)
            cb(false)
          }
        })
      },
      () => {
        done()
      }
    )
  },

  search(text, done) {
    async.eachOfLimit(src.$api, 1, (api, source, cb) => {
      if (!api.search) return cb()

      let res = null
      // log('searching', source)
      api.search(
        text,
        data => {
          if (data) {
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
  }
}

module.exports = src
