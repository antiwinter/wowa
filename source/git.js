const sg = require('simple-git')()
const which = require('which')
const log = console.log

let git = {
  $scl: 'git',
  $lcl: /notpossiblyfind/,

  info(ad, done) {
    which('git', err => {
      if (err) {
        if (ad.source === 'git')
          log(
            'In order to install from arbitrary git, wowa requires git to be installed and that it can be called using the command git.'
          )
        return done()
      }
      sg.listRemote([ad.uri], (err, data) => {
        if (err) return done()

        let d = { 'refs/tags/': 1, 'refs/heads/': 1 }
        let info = {
          name: ad.uri,
          page: ad.uri,
          version: []
        }

        for (k in d)
          data.split('\n').forEach(line => {
            // log('>>', line)
            if (line.match(/{}$/)) return
            if (line.match(k))
              info.version.unshift({
                name: line.slice(line.search(k) + k.length),
                hash: line.split('\t')[0]
              })
          })

        // log(info)
        done(info)
      })
    })
  },

  clone(uri, ref, to, hook) {
    sg.outputHandler((cmd, o1, o2) => {
      let unit = { KiB: 1024, MiB: 1 << 20, GiB: 1 << 30 }
      o2.on('data', line => {
        line
          .toString()
          .split('\r')
          .forEach(l => {
            if (!l.match(/Receiving objects/)) return
            let tr = /, [0-9\.]+ [KMG]iB \|/.exec(l)
            let evt = {
              percent:
                /\([0-9]+\//.exec(l)[0].slice(1, -1) /
                /\/[0-9]+\)/.exec(l)[0].slice(1, -1),
              transferred: !tr
                ? 0
                : tr[0].slice(2, -6) * unit[tr[0].slice(-5, -2)]
            }
            hook(evt)

            // log(evt, l)
          })
      })
    })
      .silent(true)
      .clone(
        uri,
        to,
        ['-b', ref, '--single-branch', '--depth', 1, '--progress', '--verbose'],
        (err, data) => {
          if (err) return hook(err.toString())
          else hook('done')
        }
      )
  }
}

module.exports = git
