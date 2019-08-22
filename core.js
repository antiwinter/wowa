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
const log = console.log
const win = process.platform === 'win32'
const env = process.env

const cl = {
  i: ck.yellow,
  h: ck.red,
  x: ck.dim,
  i2: ck.blue
}

function getPath(cat) {
  let pathFile = path.join(
    win ? env.APPDATA : env.HOME,
    win ? 'wowa' : '.wowa',
    'wow_path.txt'
  )
  let base

  if (fs.existsSync(pathFile)) base = fs.readFileSync(pathFile, 'utf-8').trim()
  else {
    base = path.join(
      win ? 'C:\\Program Files' : '/Applications',
      'World of Warcraft',
      '_retail_'
    )

    mk(path.dirname(pathFile), err => {
      fs.writeFileSync(pathFile, base, 'utf-8')
    })
  }

  let mode = path.basename(base)

  switch (cat) {
    case 'addon':
      return path.join(base, 'Interface', 'AddOns')
    case 'wtf':
      return path.join(base, 'WTF')
    case 'wowaads':
      return path.join(base, 'WTF', 'wowaads.json')
    case 'pathfile':
      return pathFile
    case 'tmp':
      return path.dirname(pathFile)
    case 'mode':
      return mode
  }

  return base
}

let jsp = getPath('wowaads')
let wowaads = {}

if (fs.existsSync(jsp)) {
  wowaads = JSON.parse(fs.readFileSync(jsp, 'utf-8'))
}

function save() {
  fs.writeFileSync(
    getPath('wowaads'),
    JSON.stringify(wowaads, null, 2),
    'utf-8'
  )
}

function checkPath() {
  let wow = getPath()
  let e = fs.existsSync(wow)

  // log('checking', wow)
  if (!e) {
    log('\nWoW folder not found, you can specify it by editing the file below:')
    log('\n  ' + getPath('pathfile') + '\n')
  }

  return e
}

function checkDuplicate() {
  let keys = _.keys(wowaads)
  let k

  while ((k = keys.pop())) {
    for (let i = 0; i < keys.length; i++) {
      let k2 = keys[i]
      let inc = _.intersection(wowaads[k].sub, wowaads[k2].sub)
      if (inc.length && !(wowaads[k].removed || wowaads[k2].removed)) {
        log(
          `\n${cl.i('Note:')} ${cl.h(k)} and ${cl.h(
            k2
          )} use the same subset of directory, make sure you have only one of them installed\n`
        )
        // log(inc)
        return true
      }
    }
  }

  return false
}

function clearUp(addon, done) {
  if (addon in wowaads) {
    async.forEach(
      wowaads[addon].sub,
      (sub, cb) => {
        rm(path.join(getPath('addon'), sub), err => {
          if (err) {
            log('clear up addon failed', sub)
            done(err)
            cb(false)
            return
          }

          cb()
        })
      },
      () => {
        wowaads[addon].removed = 1
        done()
      }
    )

    return
  }

  done()
}

function getAd(ad, info, tmp, hook, force) {
  let v
  let mode = getPath('mode')

  let i = 0
  for (; i < info.version.length; i++) {
    v = info.version[i]
    if (!v.game) break
    if (mode === '_classic_' && v.game.split('.')[0] === '1') break
    if (mode !== '_classic_' && v.game.split('.')[0] !== '1') break
  }

  if (force &&
    i === info.version.length) {
    i = 0
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

function install(ad, update, hook, force) {
  let tmp = path.join(getPath('tmp'), ad.key.replace(/\//g, '-'))
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

    if (update && wowaads[ad.key] && wowaads[ad.key].update >= info.update)
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

            clearUp(ad.key, () => {
              wowaads[ad.key] = {
                name: info.name,
                version: ad.version,
                size,
                source: info.source,
                update: info.update,
                sub: []
              }

              _install(dec, getPath('addon'), wowaads[ad.key].sub, err => {
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
        }, force)
      })
    })
  })
}

function batchInstall(ads, update, force) {
  let t0 = moment().unix()

  if (!checkPath()) return

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
          }, force)
        })

        return promise
      }
    })
  })

  list.run().then(res => {
    save()
    log(`${id} addons` + (update ? `, ${ud} updated` : ' installed'))
    log(`✨  done in ${moment().unix() - t0}s.`)
  })
}

let core = {
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

    // log(name, '>>', d)
    return d
  },

  add(ads, cmd) {
    batchInstall(ads.map(x => core.parseName(x)), 0, cmd.force)
  },

  rm(key) {
    clearUp(key, () => {
      save()
      log(`✨  ${cl.h(key)} removed.`)
    })
  },

  search(text) {
    // log(text)

    api.search(core.parseName(text), info => {
      if (!info) {
        log('not found')
        return
      }

      let kv = (k, v) => {
        let c = cl.i
        let h = cl.x

        return `${h(k + ':') + c(' ' + v + '')}`
      }

      let data = info.data.slice(0, 10)

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
        log('\n  ' + v.desc)
      })

      log()
    })
  },

  ls() {
    let t = new tb()
    for (let k in wowaads) {
      let v = wowaads[k]

      if (v.removed) continue

      //   t.cell('Size', numeral(v.size).format('0.0 b'))
      t.cell(cl.x('Addon keys'), cl.h(k))

      t.cell(cl.x('Version'), cl.i2(v.version))
      t.cell(cl.x('Source'), cl.i(v.source))
      t.cell(cl.x('Update'), cl.i(moment(v.update * 1000).format('MM/DD/YYYY')))
      t.newRow()
    }

    log(`\nmode: ${cl.i(getPath('mode'))}\n`)
    if (!Object.keys(wowaads).length) log('no addons\n')
    else log(t.toString())

    checkDuplicate()
  },

  info(ad) {
    let t = new tb()

    ad = core.parseName(ad)
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

  update(cmd) {
    let ads = []
    for (let k in wowaads) {
      if (!wowaads[k].removed) ads.push({ key: k, source: wowaads[k].source })
    }
    if (!ads.length) {
      log('\nnothing to update\n')
      return
    }

    if (checkDuplicate()) return

    log('\nupdating addons:')
    batchInstall(ads, 1, cmd.force)
  },

  restore(repo, cmd) {
    if (repo) {
      log('\nrestore from remote is not implemented yet\n')
      return
    }

    let ads = []
    for (let k in wowaads) {
      if (!wowaads[k].removed) ads.push(k)
    }

    if (!ads.length) {
      log('\nnothing to restore\n')
      return
    }

    log('\nrestoring addons:')
    batchInstall(ads, 0, cmd.force)
  },

  switch() {
    let pf = getPath('pathfile')
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
