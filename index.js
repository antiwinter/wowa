#!/usr/bin/env node

const cli = require('commander')
const pkg = require('./package.json')
const core = require('./core')

cli.version(pkg.version).usage('<command> [option] <addon ...>')

cli
  .command('add <addons...>')
  .description('install one or more addons locally')
  .option(
    '--force',
    'install latest version if compatible version could not be found'
  )
  .alias('install')
  .action(core.add)

cli
  .command('rm <addon>')
  .description('remove an addon from local installation')
  .alias('delete')
  .action(core.rm)

cli
  .command('search <text>')
  .description('search addons whose name contain <text>')
  .action(core.search)

cli
  .command('ls')
  .description('list all installed addons')
  .alias('list')
  .action(core.ls)

cli
  .command('info <addon>')
  .description(
    'show info of an addon, the addon does not have to be an installed locally'
  )
  .action(core.info)

cli
  .command('update')
  .description('update all installed addons')
  .option(
    '--force',
    'install latest version if compatible version could not be found'
  )
  .action(core.update)

cli
  .command('switch')
  .alias('sw')
  .description('switch mode between retail and classic')
  .action(core.switch)

cli
  .command('restore [repo]')
  .description(
    'restore addons from github repo, only <org/repo> is required, not the full URL. (e.g. antiwinter/wowui)'
  )
  .option(
    '-f, --full',
    'not only restore addons, but also restore addons settings'
  )
  .option(
    '--force',
    'install latest version if compatible version could not be found'
  )
  .action(core.restore)

cli.on('command:*', () => {
  cli.help()
})

cli.parse(process.argv)

if (process.argv.length < 3) cli.help()
