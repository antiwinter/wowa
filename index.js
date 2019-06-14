#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const rm = require('rimraf')
const mk = require('mkdirp')
const ck = require('chalk')
const cli = require('commander')
const numeral = require('numeral')
const moment = require('moment')
const async = require('async')
const ncp = require('ncp').ncp
const tb = require('easy-table')
const Listr = require('listr')
const api = require('./source')
const pkg = require('./package.json')
const log = console.log
const win = process.platform === 'win32'
const env = process.env
const g = require('got')
const dec = require('decompress')
const unzip = require('decompress-unzip')

function parseName(name) {
  let t
  let d = {
    source: name.match(/:/)
      ? ((t = name.split(':')), (name = t[1]), t[0])
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

function remove(addon, done) {
  if (addon in wowaads) {
    async.forEach(
      wowaads[addon].sub,
      (sub, cb) => {
        rm(path.join(getPath('addon'), sub), err => {
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
  g.stream(v.link)
    .on('downloadProgress', evt => {
      hook(evt)
    })
    .on('end', () => {
      dec(src, dst, {
        plugins: [unzip()]
      }).then(() => {
        hook('done')
      })
    })
    .pipe(fs.createWriteStream(src))
}

function install(ad, update, cb) {
  let tmp = path.join(getPath('tmp'), ad.key)

  if (update) cb('checking for updates...')
  api.info(ad, info => {
    if (!info) {
      return cb()
    }

    if (update && wowaads[ad.key] && wowaads[ad.key].update >= info.update) {
      cb('is up to date')
      return
    }

    rm(tmp, err => {
      if (err) {
        log('rmdir failed', err)
        return cb()
      }

      let dec = path.join(tmp, 'dec')
      mk(dec, err => {
        if (err) {
          log('mkdir failed', err)
          return cb()
        }

        getAd(ad, info, tmp, evt => {
          if (evt === 'done') {
            cb('installing...')

            let _install = () => {
              wowaads[ad.key] = {
                update: info.update,
                sub: fs.readdirSync(dec)
              }

              ncp(dec, getPath('addon'), err => {
                if (err) {
                  log('errrrrrrrrrr', err)
                  return cb()
                }

                cb(update ? 'updated' : 'installed')
              })
            }

            remove(ad.key, _install)
            return
          }

          cb(evt)
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
      title: `${ck.red(ad.key)} waiting...`,
      task(ctx, task) {
        let promise = new Promise((res, rej) => {
          install(ad, update, evt => {
            if (!evt) {
              task.title = `${ck.red(ad.key)} not avaiable`
              task.skip()
              res('na')
              return
            }

            if (typeof evt === 'string') {
              task.title = `${ck.red(ad.key)} ${evt}`
              if (evt === 'is up to date') {
                task.skip()
                res('ok')
              } else if (evt === 'installed' || evt === 'updated') {
                ud++
                res('ok')
              }
            } else {
              task.title = `${ck.red(ad.key)} downloading... ${(
                evt.percent * 100
              ).toFixed(0)}%`
            }
          })
        })

        return promise
      }
    })
  })

  list.run().then(res => {
    save()
    log(`${ads.length} addons` + update ? `, ${ud} updated` : '')
    log(`✨  done in ${moment().unix() - t0}s.`)
  })
}

cli.version(pkg.version).usage('<command> [option] <addon ...>')

cli
  .command('add <addons...>')
  .description('install one or more addons locally')
  .alias('install')
  .action(addons => {
    batchInstall(addons.map(x => parseName(x)), 0)
  })

cli
  .command('rm <addon>')
  .description('remove an addon from local installation')
  .alias('delete')
  .action(addon => {
    remove(addon, () => {
      save()
      log(`✨  ${ck.red(addon)} removed.`)
    })
  })

cli
  .command('search <text>')
  .description('search addons whose name contain <text>')
  .action(text => {
    api.search(text, info => {
      if (!info) {
        log('not found')
        return
      }

      let kv = (k, v) => {
        let c = ck.yellow
        let h = ck.dim

        return `${h(k + ':') + c(' ' + v + '')}`
      }

      let data = info.data.slice(0, 10)

      log(`\n${ck.yellow(data.length)} results from ${ck.yellow(info.source)}`)

      data.forEach((v, i) => {
        log()
        log(ck.red(v.name) + ' ' + ck.dim('(' + v.url + ')'))
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
  })

cli
  .command('ls')
  .description('list all installed addons')
  .alias('list')
  .action(() => {
    let t = new tb()
    for (let k in wowaads) {
      let v = wowaads[k]
      //   t.cell('Size', numeral(v.size).format('0.0 b'))
      t.cell(
        ck.dim('Version'),
        ck.yellow(moment(v.update * 1000).format('MM/DD/YYYY'))
      )
      t.cell(ck.dim('Addon keys'), ck.red(k))
      t.newRow()
    }

    if (!Object.keys(wowaads).length) log('no addons')
    else log('\n' + t.toString())
  })

cli
  .command('info <addon>')
  .description(
    'show info of an addon, the addon does not have to be an installed locally'
  )
  .action(addon => {
    let kv = (k, v) => {
      log(`${ck.dim(k) + ck.yellow(v)}`)
    }

    let t = new tb()

    let ad = parseName(addon)
    api.info(ad, info => {
      log('\n' + ck.red(ad.key) + '\n')
      if (!info) return log('not available\n')

      let kv = (k, v) => {
        // log('adding', k, v)
        t.cell(ck.dim('Item'), ck.dim(k))
        t.cell(ck.dim('Info'), ck.yellow(v))
        t.newRow()
      }

      for (let k in info) {
        if (k === 'version') continue

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
        kv('size', v.size)
        kv('game version', v.game)
        kv('link', v.link)
      }

      log(t.toString())
    })
  })

cli
  .command('update')
  .description('update all installed addons')
  .action(() => {
    let ads = []
    for (let k in wowaads) {
      if (!wowaads[k].removed) ads.push(k)
    }
    if (!ads.length) {
      log('\nnothing to update\n')
      return
    }

    log('\nupdating addons:')
    batchInstall(ads, 1)
  })

cli
  .command('restore [repo]')
  .description(
    'restore addons from github repo, only <org/repo> is required, not the full URL. (e.g. antiwinter/wowui)'
  )
  .option(
    '-f, --full',
    'not only restore addons, but also restore addons settings'
  )
  .action(repo => {
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
  })

cli.on('command:*', () => {
  cli.help()
})

cli.parse(process.argv)

if (process.argv.length < 3) cli.help()
