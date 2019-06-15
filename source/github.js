const x = require('x-ray')({
  filters: {
    trim(v) {
      return typeof v === 'string' ? v.trim() : v
    },
    time(v) {
      return new Date(v).valueOf() / 1000
    }
  }
})
const log = console.log

let api = {
  $url: 'https://github.com/',

  info(key, done) {
    x(api.$url + key + '/tags', {
      name: 'h1 strong a',
      owner: 'h1 .author a',
      author: 'h1 .author a',
      stars: ['.social-count | trim'],
      version: x('.Box-row', [
        {
          name: 'h4 a | trim',
          time: 'relative-time@datetime | time',
          link: '[rel="nofollow"]@href'
        }
      ])
    })((err, d) => {
      // log('/???', key, err, d)
      if (err || !d || !d.version.length) {
        done()
        return
      }

      d.update = d.version[0].time
      d.page = api.$url + key
      d.stars = d.stars[1]

      done(d)
    })
  }
}

module.exports = api
