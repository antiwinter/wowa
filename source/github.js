const { Octokit } = require('@octokit/rest')
const async = require('async')
const ok = new Octokit({
  auth: process.env.GITHUB_TOKEN
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
        // log('got dat', JSON.stringify(err, null, 2))
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
              link: `${api.$url}${ad.key}/archive/${!ad.branch ? 'master' : ad.branch
                }.zip`,
              commit: data.commit
            }
          ]
          : data.slice(0, 5).map(x => {
            return {
              name: x.name,
              link: `${api.$url}${ad.key}/archive/${x.name}.zip`,
              commit: x.commit
            }
          })

        if (!d.version || !d.version.length) {
          ad.branch = 'master'
          fetch()
          return
        }

        async.forEachLimit(d.version, 1, (x, cb) => {
          ok.git
            .getCommit({
              owner,
              repo,
              commit_sha: x.commit.sha
            })
            .then(({ data }) => {
              x.update = new Date(data.committer.date).valueOf() / 1000
              cb()
            })
        }, () => {
          d.version.sort((a, b) => b.update - a.update)
          d.update = d.version[0].update
          done(d)
        })

      }).catch(err => {
        if (err) {
          let msg = err.toString()
          if (typeof msg === 'string' && msg.match(/rate limit/)) {
            log(
              '\nThe [github] API has reached its rate limits. You can either create a GITHUB_TOKEN env, or try another time after an hour.'
            )
            log(
              'To aquire a GITHUB_TOKEN, goto https://github.com/settings/tokens, and click "Generate new token"\n'
            )
          }
        }
        done()
      })
    }

    fetch()
  }
}

module.exports = api
