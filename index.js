const fs = require('fs')
const cli = require('commander')
const api = require('./curse')
const pkg = require('./package.json')
const log = console.log

cli.version(pkg.version)
    .usage('<command> [option] <addon ...>')

cli
    .command('install <addon ...>')
    .alias('add')
    .action(addon => {
        log('getting', addon)
        let ps = fs.createWriteStream('./tmp/123.zip')
        api.get(addon, ps, em => {
            em.on('downloadProgress', evt => {
                log(evt)
            })
        })
    })

cli
    .command('search <addon>')
    .action(addon => {
        api.search(addon, info => {
            log('got info', info)
        })
    })

cli
    .parse(process.argv)
