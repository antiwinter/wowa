import ava from 'ava'
import fs from 'fs'
import vau from 'valid-url'
import mk from 'mkdirp'
import rm from 'rimraf'
import path from 'path'
import _ from 'underscore'

import cfg from './lib/config'
import core from './core'
import ads from './lib/wowaads'

const log = console.log

let ccc = 1
function nme(x) {
  return ccc++ + '-' + x
}

ava.serial.before.cb('path', t => {
  let tmpdir = cfg.getPath('tmp')

  // log('tmpdir is', tmpdir)
  rm(tmpdir, err => {
    t.assert(!err)
    mk(path.join(tmpdir, '.test', '_retail_', 'Interface', 'Addons'), err => {
      t.assert(!err)
      mk(path.join(tmpdir, '.test', '_retail_', 'WTF'), err => {
        t.assert(!err)
        mk(path.join(tmpdir, '.test', '_classic_', 'WTF'), err => {
          t.assert(!err)
          mk(
            path.join(tmpdir, '.test', '_classic_', 'Interface', 'Addons'),
            err => {
              t.assert(!err)
              ads.load()
              t.end()
            }
          )
        })
      })
    })
  })
})

ava.serial.before.cb('prepare', t => {
  core.updateSummary(() => t.end())
})

ava.serial.cb(nme('appetizer'), t => {
  t.end()
})

function commonTests(aa) {
  ava.serial.cb(nme('install'), t => {
    core.add(aa.map(a => a[0]), res => {
      let p = cfg.getPath('addon')
      t.assert(res.count === aa.length)
      t.assert(res.update === 0)

      aa.forEach(a => {
        t.assert(_.find(fs.readdirSync(p), d => d.match(a[1])))
      })

      ads.load()

      t.assert(_.keys(ads.data).length === aa.length)
      t.assert(!_.find(ads.data, d => !d.sub.length))
      t.end()
    })
  })

  ava.serial.cb(nme('update-none'), t => {
    core.update(res => {
      let p = cfg.getPath('addon')
      t.assert(res.count === 0)
      t.assert(res.update === 1)
      t.assert(res.ud === 0)

      aa.forEach(a => {
        t.assert(_.find(fs.readdirSync(p), d => d.match(a[1])))
      })

      ads.load()

      t.assert(_.keys(ads.data).length === aa.length)
      t.assert(!_.find(ads.data, d => !d.sub.length))
      t.end()
    })
  })

  ava.serial.cb(nme('update-1'), t => {
    ads.data['classicon'].update = 0

    core.update(res => {
      let p = cfg.getPath('addon')
      t.assert(res.count === 1)
      t.assert(res.update === 1)
      t.assert(res.ud === 1)

      aa.forEach(a => {
        t.assert(_.find(fs.readdirSync(p), d => d.match(a[1])))
      })

      ads.load()

      t.assert(ads.data['classicon'].update > 0)
      t.assert(_.keys(ads.data).length === aa.length)
      t.assert(!_.find(ads.data, d => !d.sub.length))
      t.end()
    })
  })

  ava.serial.cb(nme('rm-1'), t => {
    core.rm('classicon', res => {
      let p = cfg.getPath('addon')

      t.assert(!_.find(fs.readdirSync(p), d => d.match(/^Class/)))

      ads.load()

      t.assert(!ads.data['classicon'])
      t.assert(_.keys(ads.data).length === aa.length - 1)

      core.add(['classicon'], () => {
        t.end()
      })
    })
  })

  ava.serial.cb(nme('search-none'), t => {
    core.search('abcdef', info => {
      t.assert(!info)
      t.end()
    })
  })

  ava.serial.cb(nme('search-curse'), t => {
    core.search('dbm', info => {
      t.assert(info.data.length > 0)
      let v = info.data[0]

      // log('gg', info)
      t.assert(v.name.match(/Deadly Boss Mods/))
      t.assert(v.key.match(/deadly-boss-mods/))

      t.assert(vau.isUri(v.page))
      t.assert(v.download > 200000000)
      t.assert(v.update > 1561424000)

      t.end()
    })
  })

  ava.serial.cb(nme('search-mmoui'), t => {
    core.search('mmoui:dbm', info => {
      t.assert(info.data.length > 0)
      let v = info.data[0]

      // log('gg', info)
      t.assert(v.name.match(/Deadly Boss Mods/))

      if (cfg.getMode() === '_classic_') t.assert(v.key.match(/24921-/))
      else t.assert(v.key.match(/8814-DeadlyBossMods/))

      t.assert(vau.isUri(v.page))
      t.assert(v.download > 100)
      t.assert(v.update > 1561424000)

      t.end()
    })
  })

  ava.serial.cb(nme('search-tukui'), t => {
    core.search('tukui:elv', info => {
      t.assert(info.data.length > 0)
      let v = info.data[0]

      // log('gg', info)
      t.assert(v.name.match(/ElvUI/))

      if (cfg.getMode() === '_classic_') t.assert(v.key.match(/2-/))
      else t.assert(v.key.match(/0-/))

      t.assert(vau.isUri(v.page))
      t.assert(v.download > 100)
      t.assert(v.update > 1561424000)

      t.end()
    })
  })

  ava.serial.cb(nme('ls'), t => {
    let ls = core.ls()

    // t.assert(ls.search(cfg.getMode()) > 0)
    t.assert(ls.search('sellableitemdrops') > 0)
    t.assert(ls.search('classicon') > 0)

    t.end()
  })

  ava.serial.cb(nme('info-none'), t => {
    core.info('abcdef', res => {
      t.assert(!res)
      t.end()
    })
  })

  ava.serial.cb(nme('info-curse'), t => {
    core.info('deadly-boss-mods', res => {
      t.assert(res.match(/Deadly Boss Mods/))
      t.assert(res.match(/MysticalOS/))
      t.assert(res.match(/curse/))
      t.assert(res.search(cfg.getGameVersion()) > 0)
      t.end()
    })
  })

  ava.serial.cb(nme('info-mmoui'), t => {
    core.info('8814-xx', res => {
      t.assert(res.match(/Deadly Boss Mods/))
      t.assert(res.match(/mmoui/))
      t.end()
    })
  })

  ava.serial.cb(nme('import'), t => {
    ads.data = {}
    ads.save()

    core.pickup(res => {
      ads.load()

      t.assert(_.keys(ads.data).length === _.filter(aa, a => a[2]).length)
      aa.forEach(a => {
        if (a[2])
          t.assert(_.find(_.keys(ads.data), k => k.split('-')[0] === a[2]))
      })

      t.end()
    })
  })
}

commonTests([
  ['deadlybossmods/deadlybossmods', /^DBM/, '8814'],
  ['classicon', /^Class/, '18267'],
  ['mmoui:11190-Bartender4', /^Bart/, '11190'],
  ['tukui:46-ElvUIDatatextBars2', /^ElvUI/],
  ['sellableitemdrops', /^Sella/]
])

ava.serial.cb(nme('info-tukui-retail'), t => {
  core.info('0-elvui', res => {
    t.assert(res.match(/[0-9]+\/[0-9]+\/[0-9]+/))
    t.assert(res.match(/[0-9]+\.[0-9]+/g).length === 3)
    t.assert(res.match(/\.zip/))
    t.end()
  })
})

ava.serial.cb(nme('switch-to-classic'), t => {
  core.switch()
  t.end()
})

commonTests([
  ['deadlybossmods/deadlybossmods', /^DBM/, '24921'],
  ['classicon', /^Class/],
  ['mmoui:11190-Bartender4', /^Bart/],
  ['tukui:6-RedtuzkUIClassic', /^ElvUI/],
  ['sellableitemdrops', /^Sella/]
])

ava.serial.cb(nme('wowa update'), t => {
  core.checkUpdate(res => {
    t.assert(res.name === 'wowa')

    core.checkUpdate(res => {
      t.assert(res.name === 'wowa')

      t.end()
    })
  })
})
