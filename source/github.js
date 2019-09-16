const Octokit = require('@octokit/rest')
const ok = new Octokit({
  // auth: process.env.GITHUB_TOKEN
})
const log = console.log

let api = {
  $url: 'https://github.com/',
  $lcl: /github\.com\/(.*)$/,
  $fcl: '/',
  $scl: 'github.com',

  info(ad, done) {
    // install branch tip if branch provided

    let seg = ad.key.split('/')

    if (seg.length > 2) {
      ad.branch = seg.pop()
      for (; seg.length > 2; seg.pop());
      ad.key = seg.join('/')
    }

    let owner = seg.shift()
    let repo = seg.shift()

    // log('getting', { owner, repo, branch: ad.branch })

    let fetch = () => {
      let h = ad.branch
        ? ok.repos.getBranch({ owner, repo, branch: ad.branch })
        : ok.repos.listTags({ owner, repo })
      h.then(err => {
        log('got dat', JSON.stringify(err, null, 2))
        let data = err.data
        let d = {
          name: repo,
          owner,
          author: owner,
          page: api.$url + ad.key
        }

        d.version = ad.branch
          ? [
              {
                name: data.commit.sha.slice(0, 7),
                link: `${api.$url}${ad.key}/archive/${
                  !ad.branch ? 'master' : ad.branch
                }.zip`
              }
            ]
          : data.map(x => {
              return {
                name: x.name,
                link: `${api.$url}${ad.key}/archive/${x.name}.zip`
              }
            })

        if (!d.version || !d.version.length) {
          ad.branch = 'master'
          fetch()
          return
        }

        let c = ad.branch ? data.commit : data[0].commit

        ok.git
          .getCommit({
            owner,
            repo,
            commit_sha: c.sha
          })
          .then(({ data }) => {
            // log('inner', data)
            d.update = new Date(data.committer.date).valueOf() / 1000
            done(d)
          })
      }).catch(err => {
        done()
      })
    }

    fetch()
  }
}

module.exports = api
