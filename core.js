const fs = require('fs')
const path = require('path')
const rm = require('rimraf')
const mk = require('mkdirp')
const ck = require('chalk')
const numeral = require('numeral')
const moment = require('moment')
const async = require('async')
const ncp = require('ncp').ncp
const tb = require('easy-table')
const Listr = require('listr')
const _ = require('underscore')
const g = require('got')
const dec = require('decompress')
const unzip = require('decompress-unzip')

const api = require('./source')
const cfg = require('./lib/config')
const ads = require('./lib/wowaads').load()
const log = console.log

const cl = {
  i: ck.yellow,
  h: ck.red,
  x: ck.dim,
  i2: ck.blue
}

function getAd(ad, info, tmp, hook) {
  let v
  let mode = cfg.getPath('mode')

  let i = 0
  for (; i < info.version.length; i++) {
    v = info.version[i]
    if (!v.game) break
    if (mode === '_classic_' && v.game.split('.')[0] === '1') break
    if (mode !== '_classic_' && v.game.split('.')[0] !== '1') break
  }

  if (i === info.version.length) {
    return hook(`${cl.i(mode)} version is not available`)
  }

  if (v && ad.version) v = _.find(info.version, d => d.name === ad.version)
  if (!v) {
    log('fatal: version not found')
    return hook()
  }

  let src = path.join(tmp, '1.zip')
  let dst = path.join(tmp, 'dec')

  // log('streaming', v.link)

  // fix version
  ad.version = v.name
  g.stream(v.link, {
    headers: {
      'user-agent': require('ua-string')
    }
  })
    .on('downloadProgress', hook)
    .on('end', () => {
      dec(src, dst, {
        plugins: [unzip()]
      })
        .then(() => {
          hook('done')
        })
        .catch(err => {
          hook('done')
        })
    })
    .pipe(fs.createWriteStream(src))
}

function _install(from, to, sub, done) {
  let ls = fs.readdirSync(from)

  let toc = _.find(ls, x => x.match(/\.toc$/))

  // log('parsing', from, '>>', to)
  if (toc) {
    toc = toc.replace(/\.toc$/, '')
    let target = path.join(to, toc)

    // log('toc found, copy', from, '>>', target)
    rm(target, err => {
      mk(target, err => {
        ncp(from, target, done)
        sub.push(toc)
      })
    })
  } else {
    async.eachLimit(
      _.filter(ls.map(x => path.join(from, x)), x =>
        fs.statSync(x).isDirectory()
      ),
      1,
      (d, cb) => {
        _install(d, to, sub, err => {
          if (err) {
            log('err??', err)
            done(err)
            cb(false)
            return
          }
          cb()
        })
      },
      () => {
        done()
      }
    )
  }
}

function install(ad, update, hook) {
  let tmp = path.join(cfg.getPath('tmp'), ad.key.replace(/\//g, '-'))
  let notify = (status, msg) => {
    hook({
      status,
      msg
    })
  }

  notify('ongoing', update ? 'checking for updates...' : 'waiting...')

  api.info(ad, info => {
    if (!info) return notify('failed', 'not availabe')

    // fix source
    ad.source = info.source

    if (update && ads.data[ad.key] && ads.data[ad.key].update >= info.update)
      return notify('skip', 'is already up to date')

    notify('ongoing', 'preparing download...')
    rm(tmp, err => {
      if (err) return notify('failed', 'failed to rmdir ' + JSON.stringify(err))

      let dec = path.join(tmp, 'dec')
      mk(dec, err => {
        if (err)
          return notify('failed', 'failed to mkdir ' + JSON.stringify(err))

        let size = 0
        notify('ongoing', 'downloading...')
        getAd(ad, info, tmp, evt => {
          if (!evt || (typeof evt === 'string' && evt !== 'done')) {
            notify('failed', !evt ? 'failed to download' : evt)
          } else if (evt === 'done') {
            notify('ongoing', 'clearing previous install...')

            ads.clearUp(ad.key, () => {
              ads.data[ad.key] = {
                name: info.name,
                version: ad.version,
                size,
                source: info.source,
                update: info.update,
                sub: []
              }

              _install(dec, cfg.getPath('addon'), ads.data[ad.key].sub, err => {
                if (err) return notify('failed', 'failed to copy file')

                notify('done', update ? 'updated' : 'installed')
              })
            })
          } else {
            notify(
              'ongoing',
              `downloading... ${(evt.percent * 100).toFixed(0)}%`
            )
            size = evt.transferred
            // log(evt)
          }
        })
      })
    })
  })
}

function batchInstall(ads, update) {
  let t0 = moment().unix()

  if (!cfg.checkPath()) return

  let list = new Listr([], { concurrent: 10 })
  let ud = 0
  let id = 0

  ads.forEach(ad => {
    list.add({
      title: `${cl.h(ad.key)} waiting...`,
      task(ctx, task) {
        let promise = new Promise((res, rej) => {
          install(ad, update, evt => {
            task.title = ''
            task.title += cl.h(ad.key)
            if (ad.version) task.title += cl.i2(' @' + cl.i2(ad.version))
            if (ad.source) task.title += cl.i(` [${ad.source}]`)

            // log('ad is', ad)

            task.title += ' ' + cl.x(evt.msg)

            if (
              evt.status === 'done' ||
              evt.status === 'skip' ||
              evt.status === 'failed'
            ) {
              if (evt.status !== 'done') task.skip()
              else {
                if (update) ud++
                id++
              }

              res('ok')
            }
          })
        })

        return promise
      }
    })
  })

  list.run().then(res => {
    ads.save()
    log(`${id} addons` + (update ? `, ${ud} updated` : ' installed'))
    log(`✨  done in ${moment().unix() - t0}s.`)
  })
}

let core = {
  add(ads) {
    batchInstall(ads.map(x => api.parseName(x)), 0)
  },

  rm(key) {
    ads.clearUp(key, () => {
      ads.save()
      log(`✨  ${cl.h(key)} removed.`)
    })
  },

  search(text) {
    // log(text)

    api.search(api.parseName(text), info => {
      if (!info) {
        log('not found')
        return
      }

      let kv = (k, v) => {
        let c = cl.i
        let h = cl.x

        return `${h(k + ':') + c(' ' + v + '')}`
      }

      let data = info.data.slice(0, 15)

      log(`\n${cl.i(data.length)} results from ${cl.i(info.source)}`)

      data.forEach((v, i) => {
        log()
        log(cl.h(v.name) + ' ' + cl.x('(' + v.page + ')'))
        log(
          `  ${kv('key', v.key)} ${kv(
            'download',
            numeral(v.download).format('0.0a')
          )} ${kv('version', moment(v.update * 1000).format('MM/DD/YYYY'))}`
        )
        // log('\n  ' + v.desc)
      })

      log()
    })
  },

  ls() {
    let t = new tb()
    for (let k in ads.data) {
      let v = ads.data[k]

      t.cell(cl.x('Addon keys'), cl.h(k))

      t.cell(cl.x('Version'), cl.i2(v.version))
      t.cell(cl.x('Source'), cl.i(v.source))
      t.cell(cl.x('Update'), cl.i(moment(v.update * 1000).format('MM/DD/YYYY')))
      t.newRow()
    }

    log(`\nmode: ${cl.i(cfg.getPath('mode'))}\n`)
    if (!Object.keys(ads.data).length) log('no addons\n')
    else log(t.toString())

    ads.checkDuplicate()
  },

  info(ad) {
    let t = new tb()

    ad = api.parseName(ad)
    api.info(ad, info => {
      log('\n' + cl.h(ad.key) + '\n')
      if (!info) return log('not available\n')

      let kv = (k, v) => {
        // log('adding', k, v)
        t.cell(cl.x('Item'), cl.x(k))
        t.cell(cl.x('Info'), cl.i(v))
        t.newRow()
      }

      for (let k in info) {
        if (k === 'version' || info[k] === undefined) continue

        kv(
          k,
          k === 'create' || k === 'update'
            ? moment(info[k] * 1000).format('MM/DD/YYYY')
            : k === 'download'
            ? numeral(info[k]).format('0.0a')
            : info[k]
        )
      }

      let v = info.version[0]
      if (v) {
        kv('version', v.name)
        if (v.size) kv('size', v.size)
        if (v.game)
          kv('game version', _.uniq(info.version.map(x => x.game)).join(', '))
        kv('link', v.link)
      }

      log(t.toString())
    })
  },

  update() {
    let ads = []
    for (let k in ads.data) {
      ads.push({ key: k, source: ads.data[k].source })
    }
    if (!ads.length) {
      log('\nnothing to update\n')
      return
    }

    if (ads.checkDuplicate()) return

    log('\nupdating addons:')
    batchInstall(ads, 1)
  },

  restore(repo) {
    if (repo) {
      log('\nrestore from remote is not implemented yet\n')
      return
    }

    let ads = []
    for (let k in ads.data) {
      ads.push(k)
    }

    if (!ads.length) {
      log('\nnothing to restore\n')
      return
    }

    log('\nrestoring addons:')
    batchInstall(ads, 0)
  },

  buildSummary(done) {
    let p = cfg.getPath('db')

    // if (fs.existsSync(p)) {
    //   done(JSON.parse(fs.readFileSync(p, 'utf-8')))
    //   return
    // }

    mk(path.dirname(p), err => {
      api.summary(s => {
        fs.writeFileSync(p, JSON.stringify(s, null, 2), 'utf-8')
        done(s)
      })
    })
  },

  pickup() {
    core.buildSummary(sum => {
      let p = cfg.getPath('addon')
      fs.readdir(p, (err, dirs) => {
        let unknown = []
        dirs.forEach(dir => {
          if (ads.dirStatus(dir)) return

          log('picking up', dir)
          let l = _.find(sum, a => a.dir.indexOf(dir) >= 0)

          if (!l) {
            unknown.push(dir)
          } else {
            log('found', l)
            let update = Math.floor(
              fs.statSync(path.join(p, dir)).mtimeMs / 1000
            )
            let k =
              l.id +
              '-' +
              _.filter(l.name.split(''), s => s.match(/^[a-z0-9]+$/i)).join('')
            if (ads.data[k]) ads.data[k].sub.push(dir)
            else
              ads.data[k] = {
                name: l.name,
                version: 'unknown',
                source: l.source,
                update,
                sub: [dir]
              }
          }
        })

        ads.save()
      })
    })
  },

  switch() {
    let pf = cfg.getPath('pathfile')
    let p = fs.readFileSync(pf, 'utf-8').trim()
    let mode = path.basename(p)

    // log('pf', pf, 'p', p, 'mode', mode)

    if (mode === '_retail_') mode = '_classic_'
    else mode = '_retail_'

    p = path.join(path.dirname(p), mode)
    fs.writeFileSync(pf, p, 'utf-8')
    log('mode switched to:', cl.i(mode))
  }
}

module.exports = core
