const fs = require('fs')
const rm = require('rimraf')
const mk = require('mkdirp')
const ck = require('chalk')
const cli = require('commander')
const numeral = require('numeral')
const moment = require('moment')
const async = require('async')
const fd = require('platform-folders')
const Listr = require('listr')
const api = require('./curse')
const pkg = require('./package.json')
const log = console.log
const win = process.platform === 'win32'

cli.version(pkg.version).usage('<command> [option] <addon ...>')

cli
  .command('add <addon...>')
  .description('install an addon locally')
  .alias('install')
  .action(addon => {
    let t0 = moment().unix()

    let list = new Listr([], { concurrent: true })

    addon.forEach(a => {
      let path = `${fd.getDataHome()}/wowa/${a}/`
      if (win) path = `${fd.getDataHome()}\\wowa\\${a}\\`

      list.add({
        title: `${ck.red(a)} waiting...`,
        task(ctx, task) {
          let promise = new Promise((res, rej) => {
            rm(path, err => {
              if (err) {
                log('rmdir failed', err)
                return
              }

              mk(path + 'dec', err => {
                if (err) {
                  log('mkdir failed', err)
                  return
                }

                api.get(a, path, evt => {
                  if (!evt) {
                    task.title = `${ck.red(a)} not avaiable`
                    task.skip()
                    res('ok')
                    return
                  }

                  if (evt === 'done') {
                    task.title = `${ck.red(a)} installed`
                    res('ok')
                  } else {
                    task.title = `${ck.red(a)} downloading... ${(
                      evt.percent * 100
                    ).toFixed(0)}%`
                  }
                })
              })
            })
          })

          return promise
        }
      })
    })

    list.run().then(res => {
      log(`✨  Done in ${moment().unix() - t0}s.`)
    })
  })

cli
  .command('rm <addon>')
  .description('remove an addon from local installation')
  .action(() => {})

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
        log(ck.magenta(v.name))
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
  .action(() => {})

cli
  .command('info <addon>')
  .description(
    'show info of an addon, the addon does not have to be an installed locally'
  )
  .action(() => {})

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
  .action(() => {})

cli.parse(process.argv)
