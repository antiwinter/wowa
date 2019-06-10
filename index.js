const fs = require('fs')
const rm = require('rimraf')
const mk = require('mkdirp')
const cli = require('commander')
const api = require('./curse')
const pkg = require('./package.json')
const log = console.log

cli.version(pkg.version).usage('<command> [option] <addon ...>')

cli
  .command('install <addon...>')
  //   .alias('add')
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
    log('got info', info)
  })
})

cli.parse(process.argv)
