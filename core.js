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
const api = require('./source')
const log = console.log
const win = process.platform === 'win32'
const env = process.env
const g = require('got')
const dec = require('decompress')
const unzip = require('decompress-unzip')

const cl = {
  i: ck.yellow,
  h: ck.red,
  x: ck.dim
}

function parseName(name) {
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

  //   log('checking', wow)
  if (!e) {
    log('\nWoW folder not found, you can specify it by editing the file below:')
    log('\n  ' + getPath('pathfile') + '\n')
  }

  return e
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

function getAd(ad, info, tmp, hook) {
  let v = info.version[0]
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
  g.stream(v.link)
    .on('downloadProgress', hook)
    .on('end', () => {
      dec(src, dst, {
        plugins: [unzip()]
      }).then(() => {
        hook('done')
      })
    })
    .pipe(fs.createWriteStream(src))
}

function install(ad, update, hook) {
  let tmp = path.join(getPath('tmp'), ad.key)
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
          if (!evt) {
            notify('failed', 'failed to download')
          } else if (evt === 'done') {
            notify('ongoing', 'clearing previous install...')

            clearUp(ad.key, () => {
              wowaads[ad.key] = {
                name: info.name,
                version: ad.version,
                size,
                source: info.source,
                update: info.update,
                sub: fs.readdirSync(dec)
              }

              ncp(dec, getPath('addon'), err => {
                if (err)
                  return notify(
                    'failed',
                    'failed to copy file' + JSON.stringify(err)
                  )

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

  if (!checkPath()) return

  let list = new Listr([], { concurrent: 10 })
  let ud = 0

  ads.forEach(ad => {
    list.add({
      title: `${cl.h(ad.key)} waiting...`,
      task(ctx, task) {
        let promise = new Promise((res, rej) => {
          install(ad, update, evt => {
            task.title = ''
            task.title += cl.h(ad.key)
            if (ad.version) task.title += cl.i(' @' + cl.i(ad.version))
            if (ad.source) task.title += cl.i(` [${ad.source}]`)

            // log('ad is', ad)

            task.title += ' ' + cl.x(evt.msg)

            if (evt.status === 'done' || evt.status === 'skip') {
              if (evt.status === 'skip') task.skip()
              else if (update) ud++

              res('ok')
            }
          })
        })

        return promise
      }
    })
  })

  list.run().then(res => {
    save()
    log(`${ads.length} addons` + (update ? `, ${ud} updated` : ' installed'))
    log(`✨  done in ${moment().unix() - t0}s.`)
  })
}

module.exports = {
  add(ads) {
    batchInstall(ads.map(x => parseName(x)), 0)
  },

  rm(key) {
    clearUp(key, () => {
      save()
      log(`✨  ${cl.h(key)} removed.`)
    })
  },

  search(text) {
    // log(text)
    api.search(text, info => {
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
        log(cl.h(v.name) + ' ' + cl.x('(' + v.url + ')'))
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
      //   t.cell('Size', numeral(v.size).format('0.0 b'))
      t.cell(
        cl.x('Version'),
        cl.i(moment(v.update * 1000).format('MM/DD/YYYY'))
      )
      t.cell(cl.x('Addon keys'), cl.h(k))
      t.newRow()
    }

    if (!Object.keys(wowaads).length) log('no addons')
    else log('\n' + t.toString())
  },

  info(ad) {
    let kv = (k, v) => {
      log(`${cl.x(k) + cl.i(v)}`)
    }

    let t = new tb()

    ad = parseName(ad)
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
        if (v.game) kv('game version', v.game)
        kv('link', v.link)
      }

      log(t.toString())
    })
  },

  update() {
    let ads = []
    for (let k in wowaads) {
      if (!wowaads[k].removed) ads.push({ key: k, source: wowaads[k].source })
    }
    if (!ads.length) {
      log('\nnothing to update\n')
      return
    }

    log('\nupdating addons:')
    batchInstall(ads, 1)
  },

  restore(repo) {
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
    batchInstall(ads, 0)
  }
}
