const fs = require('fs')
const rm = require('rimraf')
const mk = require('mkdirp')
const ck = require('chalk')
const cli = require('commander')
const numeral = require('numeral')
const moment = require('moment')
const api = require('./curse')
const pkg = require('./package.json')
const log = console.log

cli.version(pkg.version).usage('<command> [option] <addon...>')

cli
  .command('add <addon...>')
  .alias('get')
  .alias('install')
  .action(addon => {
    log('getting', addon)

    let path = `./tmp/${addon}/`
    mk(path + 'dec')
    api.get(addon, path, evt => {
      if (!evt) {
        log('not available')
        return
      }
      log('got evt', evt)
    })
  })

cli.command('search <addon>').action(addon => {
  api.search(addon, info => {
    if (!info) {
      log('not found')
      return
    }

    // log('gg info', info)

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

cli.command('list').action(() => {})

cli.parse(process.argv)
