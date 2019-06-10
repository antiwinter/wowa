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
const fd = require('platform-folders')
const tb = require('easy-table')
const Listr = require('listr')
const api = require('./curse')
const pkg = require('./package.json')
const log = console.log
const win = process.platform === 'win32'

function getPath(cat) {
  let pathFile = path.join(fd.getDataHome(), 'wowa', 'wow_path.txt')
  let base

  if (fs.existsSync(pathFile)) base = fs.readFileSync(pathFile, 'utf-8')
  else {
    base = path.join(
      win ? 'C:\\Program Files' : '/Applications',
      'World of Warcraft',
      '_retail_'
    )

    fs.writeFileSync(pathFile, base, 'utf-8')
  }

  if (cat === 'addon') {
    return path.join(base, 'Interface', 'AddOns')
  } else if (cat === 'wtf') {
    return path.join(base, 'WTF')
  } else if (cat === 'wowaads') {
    return path.join(base, 'WTF', 'wowaads.json')
  } else if (cat === 'pathfile') {
    return pathFile
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

function install(addon, cb) {
  let tmp = path.join(fd.getDataHome(), 'wowa', addon)

  api.info(addon, info => {
    if (!info) {
      return cb()
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

        api.get(addon, tmp, evt => {
          if (evt === 'done') {
            cb('installing...')

            let _install = () => {
              wowaads[addon] = {
                update: info.update,
                sub: fs.readdirSync(dec)
              }

              ncp(dec, getPath('addon'), err => {
                if (err) return cb()

                cb('done')
              })
            }

            remove(addon, _install)
            return
          }

          cb(evt)
        })
      })
    })
  })
}

cli.version(pkg.version).usage('<command> [option] <addon ...>')

cli
  .command('add <addon...>')
  .description('install an addon locally')
  .alias('install')
  .action(addon => {
    let t0 = moment().unix()

    if (!checkPath()) return

    let list = new Listr([], { concurrent: 5 })

    addon.forEach(a => {
      list.add({
        title: `${ck.red(a)} waiting...`,
        task(ctx, task) {
          let promise = new Promise((res, rej) => {
            install(a, evt => {
              if (!evt) {
                task.title = `${ck.red(a)} not avaiable`
                task.skip()
                res('na')
                return
              }

              if (typeof evt === 'string') {
                task.title = `${ck.red(a)} ${evt}`
                if (evt === 'done') res('ok')
              } else {
                task.title = `${ck.red(a)} downloading... ${(
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
      log(`✨  Done in ${moment().unix() - t0}s.`)
    })
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
        let c = ck.bgYellow
        let h = ck.bgMagenta

        return `${h(' ' + k + ' ') + c(' ' + v + ' ')}`
      }

      info.forEach((v, i) => {
        log()
        log(ck.magenta(v.name) + ' ' + ck.dim('(' + v.url + ')'))
        log(
          `  ${kv('key', v.key)} ${kv(
            'download',
            numeral(v.download).format('0.0a')
          )} ${kv('update', moment(v.update * 1000).format('MM/DD/YYYY'))}`
        )
        log(ck.dim('  ' + v.desc))
      })
    })
  })

cli
  .command('ls')
  .description('list all installed addons')
  .action(() => {
    let t = new tb()
    for (let k in wowaads) {
      let v = wowaads[k]
      //   t.cell('Size', numeral(v.size).format('0.0 b'))
      t.cell(
        ck.dim('Updated'),
        ck.yellow(moment(v.update * 1000).format('MM/DD/YYYY'))
      )
      t.cell(ck.dim('Key'), ck.red(k))
      t.newRow()
    }

    log('\n' + t.toString())
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

    api.info(addon, info => {
      log('\n' + ck.red(addon) + '\n')

      for (let k in info) {
        t.cell(ck.dim('Item'), ck.dim(k))
        t.cell(
          ck.dim('Info'),
          ck.yellow(
            k === 'create' || k === 'update'
              ? moment(info[k] * 1000).format('MM/DD/YYYY')
              : k === 'download'
              ? numeral(info[k]).format('0.0a')
              : info[k]
          )
        )

        t.newRow()
      }

      log(t.toString())
    })
  })

cli
  .command('update')
  .description('update all installed addons')
  .action(() => {})

cli
  .command('restore <repo>')
  .description(
    'restore addons from github repo, only <org/repo> is required, not the full URL. (e.g. antiwinter/wowui)'
  )
  .option(
    '-f, --full',
    'not only restore addons, but also restore addons settings'
  )
  .action(() => {
    log('\nnot implemented\n')
  })

cli.parse(process.argv)
