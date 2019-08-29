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
  $lcl: /github\.com\/(.*)$/,
  $fcl: '/',
  $scl: 'github.com',

  $tip(ad, done) {
    let page = api.$url + ad.key + `/tree/${!ad.branch ? 'master' : ad.branch}`
    x(page, {
      name: 'h1 strong a',
      owner: 'h1 .author a',
      author: 'h1 .author a',
      stars: ['.social-count | trim'],
      tease: '.commit-tease-sha | trim',
      update: 'relative-time@datetime | time'
    })((err, d) => {
      // log('/tip', ad.key, err, d, '\n')
      if (err || !d || !d.tease) {
        done()
        return
      }

      d.stars = d.stars[1]
      d.version = [
        {
          name: d.tease,
          time: d.update,
          link: `${api.$url}${ad.key}/archive/${
            !ad.branch ? 'master' : ad.branch
          }.zip`
        }
      ]
      d.page = page

      done(d)
    })
  },

  info(ad, done) {
    // install branch tip if branch provided

    let seg = ad.key.split('/')

    if (seg.length > 2) {
      ad.branch = seg.pop()
      for (; seg.length > 2; seg.pop());
      ad.key = seg.join('/')
    }

    if (ad.branch) {
      api.$tip(ad, done)
      return
    }

    x(api.$url + ad.key + '/tags', {
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
      // log('/???', ad.key, err, d)
      if (err || !d || !d.version.length) {
        api.$tip(ad, done)
        return
      }

      d.update = d.version[0].time
      d.page = api.$url + ad.key
      d.stars = d.stars[1]

      done(d)
    })
  }
}

module.exports = api
