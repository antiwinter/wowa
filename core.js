const fs = require('fs')
const path = require('path')
const rm = require('rimraf')
const mk = require('mkdirp')
const numeral = require('numeral')
const moment = require('moment')
const async = require('async')
const ncp = require('ncp').ncp
const tb = require('easy-table')
const Listr = require('listr')
const _ = require('underscore')
const g = require('got')
const pi = require('package-info')

const api = require('./source')
const cfg = require('./lib/config')
const unzip = require('./lib/unzip')
const cl = require('./lib/color')
const ads = require('./lib/wowaads').load()
const pkg = require('./package.json')
const log = console.log

function getAd(ad, info, tmp, hook) {
  let src = path.join(tmp, '1.zip')
  let dst = path.join(tmp, 'dec')

  // download git
  if (info.source === 'git')
    return api.$api.git.clone(ad.uri, ad.branch, dst, hook)

  let v = info.version[0]
  if (!v) {
    log('fatal: version not found')
    return hook()
  }

  if (ad.version) v = _.find(info.version, d => d.name === ad.version)

  // log('streaming', v.link)

  // fix version
  ad.version = v.name
  g.stream(v.link, {
    headers: {
      'user-agent': require('ua-string')
    }
  })
    .on('downloadProgress', hook)
    .on('error', err => {
      // log('stream error', typeof err, err)
      hook(err ? err.toString() : 'download error')
    })
    .pipe(fs.createWriteStream(src))
    .on('close', () => {
      unzip(src, dst, err => {
        if (err) return hook('unzip failed')
        hook('done')
      })
    })
}

function _install(from, to, sub, done) {
  let ls = fs.readdirSync(from)

  let toc = _.find(ls, x => x.match(/\.toc$/))

  // log('\n\n searching', from, toc, to)
  if (toc) {
    toc = toc.replace(/\.toc$/, '')
    let target = path.join(to, toc)

    // log('\n\ntoc found, copy', from, '>>', target, '\n\n')
    rm(target, err => {
      // log('\n\n', 'rm err', err)
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
            log('\n\nerr??', err, '\n\n')
            done(err)
            cb(false)
            return
          }
          // log('\n\ninstalling from', d, 'to', to, sub, '\n\n')
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
  // log('installing', ad)
  let tmp = path.join(cfg.getPath('tmp'), ad.key.replace(/\/|:/g, '.'))
  let notify = (status, msg) => {
    hook({
      status,
      msg
    })
  }

  if (update && ad.pin) return notify('skip', 'is pinned')

  notify('ongoing', update ? 'checking for updates...' : 'waiting...')

  api.info(ad, info => {
    if (!info) return notify('failed', 'not available')

    // fix source
    ad.source = info.source

    let _d = ads.data[ad.key]
    if (
      update &&
      _d &&
      (_d.update >= info.update || (_d.hash && _d.hash === info.hash))
    )
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
              let d = (ads.data[ad.key] = {
                name: info.name,
                version: ad.version,
                size,
                source: info.source,
                update: info.update,
                sub: []
              })

              if (ad.anyway) d.anyway = ad.anyway
              if (ad.branch) d.branch = ad.branch
              if (ad.source === 'git') {
                d.uri = ad.uri
                d.hash = info.hash
              }

              _install(dec, cfg.getPath('addon'), d.sub, err => {
                if (err) return notify('failed', 'failed to copy file')

                ads.save()
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

function batchInstall(aa, update, done) {
  let t0 = moment().unix()

  let list = new Listr([], {
    concurrent: 10,
    renderer: process.env.TEST_WOWA ? 'silent' : 'default'
  })
  let ud = 0
  let id = 0

  aa.forEach(ad => {
    list.add({
      title: `${cl.h(ad.key)} waiting...`,
      task(ctx, task) {
        let promise = new Promise((res, rej) => {
          install(ad, update, evt => {
            if (!task.$st) {
              task.title = ''
              task.title += cl.h(ad.key)
              if (ad.version) task.title += cl.i2(' @' + cl.i2(ad.version))
              if (ad.source) task.title += cl.i(` [${ad.source}]`)

              task.title += ' ' + cl.x(evt.msg)
            }

            if (
              evt.status === 'done' ||
              evt.status === 'skip' ||
              evt.status === 'failed'
            ) {
              task.$st = evt.status
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
    log(`\n${id} addons` + (update ? `, ${ud} updated` : ' installed'))
    log(`✨  done in ${moment().unix() - t0}s.\n`)
    if (done) done({ count: id, update, ud })
  })
}

let core = {
  add(aa, done) {
    api.getDB(db => {
      log('\nInstalling addon' + (aa.length > 1 ? 's...' : '...') + '\n')
      batchInstall(aa.map(x => api.parseName(x)), 0, done)
    })
  },

  rm(keys, done) {
    let n = 0
    async.eachLimit(
      keys,
      1,
      (key, cb) => {
        ads.clearUp(key, err => {
          if (!err) n++
          ads.save()
          cb()
        })
      },
      () => {
        log(`✨  ${n} addon${n > 1 ? 's' : ''} removed.`)
        if (done) done()
      }
    )
  },

  pin(keys, pup) {
    let d = ads.data

    let n = 0
    keys.forEach(k => {
      if (d[k]) {
        d[k].pin = pup
        n++
      }
    })
    ads.save()

    log(`✨  ${n} addon${n > 1 ? 's' : ''} ${pup ? '' : 'un'}pinned.`)
  },

  search(text, done) {
    // log(text)

    api.search(api.parseName(text), info => {
      if (!info) {
        log('\nNothing is found\n')
        if (done) done(info)
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
      if (done) done(info)
    })
  },

  ls(opt) {
    let t = new tb()
    let _d = ads.data

    let ks = _.keys(_d)

    ks.sort((a, b) => {
      return opt.time
        ? _d[b].update - _d[a].update
        : 1 - (a.replace(/[^a-zA-Z]/g, '') < b.replace(/[^a-zA-Z]/g, '')) * 2
    })

    ks.forEach(k => {
      let v = _d[k]

      t.cell(cl.x('Addon keys'), cl.h(k) + (v.anyway ? cl.i2(' [anyway]') : ''))
      t.cell(cl.x('Version'), (v.pin ? cl.i('! ') : '') + cl.i2(v.version))
      t.cell(cl.x('Source'), cl.i(v.source))
      t.cell(cl.x('Update'), cl.i(moment(v.update * 1000).format('YYYY-MM-DD')))
      t.newRow()
    })

    log()

    if (!ks.length) log('no addons\n')
    else log(opt.long ? t.toString() : cl.h(cl.ls(ks)))

    ads.checkDuplicate()

    log(
      `${cl.x('You are in: ')} ${cl.i(cfg.getMode())} ${cl.i2(
        cfg.getMode('ver')
      )}\n`
    )

    let ukn = ads.unknownDirs()

    if (ukn.length) {
      log(
        cl.x(
          `❗ ${ukn.length} folder${ukn.length > 1 ? 's' : ''
          } not managing by wowa`
        )
      )
      log(cl.x('---------------------------------'))
      log(cl.x(cl.ls(ukn)))
    }

    return t.toString()
  },

  info(ad, done) {
    let t = new tb()

    ad = api.parseName(ad)
    api.info(ad, info => {
      log('\n' + cl.h(ad.key) + '\n')
      if (!info) {
        log('Not available\n')
        if (done) done()
        return
      }

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
      if (v && info.source !== 'git') {
        kv('version', v.name)
        if (v.size) kv('size', v.size)
        if (v.game)
          kv('game version', _.uniq(info.version.map(x => x.game)).join(', '))
        if (v.link) kv('link', v.link)
      }

      log(t.toString())
      if (done) done(t.toString())
    })
  },

  update(keys, opt, done) {
    api.getDB(opt.db ? null : db => {
      let aa = []
      if (!keys) keys = _.keys(ads.data)

      keys.forEach(k => {
        if (k in ads.data)
          aa.push({
            key: k,
            source: ads.data[k].source,
            anyway: ads.data[k].anyway && cfg.anyway(),
            branch: ads.data[k].branch,
            uri: ads.data[k].uri,
            hash: ads.data[k].hash,
            pin: ads.data[k].pin
          })
      })

      if (!aa.length) {
        log('\nnothing to update\n')
        return
      }

      if (ads.checkDuplicate()) return
      log('\nUpdating addons:\n')
      batchInstall(aa, 1, done)
    })
  },

  restore(repo, done) {
    if (repo) {
      log('\nrestore from remote is not implemented yet\n')
      return
    }

    api.getDB(db => {
      let aa = []
      for (let k in ads.data) {
        aa.push({
          key: k,
          source: ads.data[k].source,
          anyway: ads.data[k].anyway && cfg.anyway(),
          branch: ads.data[k].branch,
          uri: ads.data[k].uri,
          hash: ads.data[k].hash
        })
      }

      if (!aa.length) {
        log('\nnothing to restore\n')
        return
      }

      log('\nRestoring addons:')
      batchInstall(aa, 0, done)
    })
  },

  pickup(done) {
    api.getDB(db => {
      let p = cfg.getPath('addon')
      let imported = 0
      let importedDirs = 0

      if (!db) {
        if (done) done()
        return
      }

      ads.unknownDirs().forEach(dir => {
        if (ads.dirStatus(dir)) return

        // log('picking up', dir)
        let l = _.filter(db, a => a.dir && a.dir.indexOf(dir) >= 0 && cfg.testMode(a.mode))

        if (!l.length) return
        l.sort((a, b) => a.id - b.id)
        // log(l)
        l = l[0]

        // log('found', l)
        importedDirs++
        let update = Math.floor(fs.statSync(path.join(p, dir)).mtimeMs / 1000)
        let k =
          l.source === 'curse'
            ? l.key
            : l.id +
            '-' +
            _.filter(l.name.split(''), s => s.match(/^[a-z0-9]+$/i)).join('')

        if (ads.data[k]) ads.data[k].sub.push(dir)
        else {
          ads.data[k] = {
            name: l.name,
            version: 'unknown',
            source: l.source,
            update,
            sub: [dir]
          }
          imported++
        }
      })

      log(`\n✨ imported ${imported} addons (${importedDirs} folders)\n`)

      let ukn = ads.unknownDirs()
      if (ukn.length) {
        log(
          cl.h(
            `❗ ${ukn.length} folder${ukn.length > 1 ? 's are' : ' is'
            } not recgonized\n`
          )
        )
        log(cl.x(cl.ls(ukn)))
      }

      ads.save()
      if (done) done(ukn)
    })
  },

  switch(opt) {
    let mo =
      opt.ptr || opt.retailPtr
        ? '_ptr_'
        : opt.beta || opt.retailBeta
          ? '_beta_'
          : opt.classicPtr
            ? '_classic_ptr_'
            : opt.classicTbc
              ? '_tbc_'
              : opt.classicBeta
                ? '_classic_beta_'
                : opt.retail
                  ? '_retail_'
                  : opt.classic
                    ? '_classic_'
                    : cfg.testMode('_retail_')
                      ? '_tbc_'
                      : '_retail_'

    cfg.setModePath(mo)

    log(
      `\n${cl.x('Mode switched to: ')} ${cl.i(cfg.getMode())} ${cl.i2(
        cfg.getMode('ver')
      )}\n`
    )
    ads.load()
  },

  checkUpdate(done) {
    let v2n = v => {
      let _v = 0
      v.split('.').forEach((n, i) => {
        _v *= 100
        _v += parseInt(n)
      })

      return _v
    }

    let p = cfg.getPath('update')
    let e = fs.existsSync(p)
    let i

    if (!e || new Date() - fs.statSync(p).mtime > 24 * 3600 * 1000) {
      // fetch new data
      pi('wowa').then(res => {
        fs.writeFileSync(p, JSON.stringify(res), 'utf-8')
        done(res)
      })
      return
    } else if (e) i = JSON.parse(fs.readFileSync(p, 'utf-8'))

    if (i) {
      // log(v2n(i.version), v2n(pkg.version))
      if (v2n(i.version) > v2n(pkg.version)) {
        log(
          cl.i('\nNew wowa version'),
          cl.i2(i.version),
          cl.i('is available, use the command below to update\n'),
          '  npm install -g wowa\n'
        )
      }
    }

    done(i)
  }
}

module.exports = core
