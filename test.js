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
import api from './source'

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
    core.update(null, {}, res => {
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

    core.update(null, {}, res => {
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
    core.rm(['classicon'], res => {
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
    let ls = core.ls({ long: 1 })

    // t.assert(ls.search(cfg.getMode()) > 0)
    t.assert(ls.search('sellableitemdrops') > 0)
    t.assert(ls.search('classicon') > 0)

    ls = core.ls({})

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
      // t.assert(res.search(cfg.getGameVersion()) > 0)
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

      log(ads.data)

      t.assert(_.keys(ads.data).length === _.filter(aa, a => a[2]).length)
      // aa.forEach(a => {
      //   if (a[2]) t.assert(_.find(_.keys(ads.data), k => k.search(a[2]) >= 0))
      // })

      t.end()
    })
  })
}

commonTests([
  ['deadlybossmods/deadlybossmods', /^DBM/, 1],
  ['classicon', /^Class/, 1],
  ['mmoui:11190-Bartender4', /^Bart/, 1],
  ['tukui:46-ElvUIDatatextBars2', /^ElvUI/, 1],
  ['sellableitemdrops', /^Sella/, 1]
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
  core.switch({})
  t.end()
})

commonTests([
  ['deadlybossmods/deadlybossmods', /^DBM/, 1],
  ['bigwigsmods/bigwigs/classic', /^BigWigs/, 1],
  ['classicon', /^Class/, 1],
  ['mmoui:11190-Bartender4', /^Bart/, 1],
  ['tukui:6-RedtuzkUIClassic', /^ElvUI/, 1],
  ['sellableitemdrops', /^Sella/, 1]
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

ava.serial.cb(nme('name parser'), t => {
  let names = {
    'curse:molinari': { key: 'molinari', source: 'curse' },
    'https://www.curseforge.com/wow/addons/molinari': {
      key: 'molinari',
      source: 'curse'
    },
    'https://wow.curseforge.com/projects/molinari': {
      key: 'molinari',
      source: 'curse'
    },
    'wowi:13188': { key: '13188', source: 'mmoui' },
    'https://www.wowinterface.com/downloads/info13188-Molinari.html': {
      key: '13188-Molinari',
      source: 'mmoui'
    },
    'deadly-boss-mods': { key: 'deadly-boss-mods', source: null },
    'curse:deadly-boss-mods': { key: 'deadly-boss-mods', source: 'curse' },
    'mmoui:8814-DeadlyBossMods': {
      key: '8814-DeadlyBossMods',
      source: 'mmoui'
    },
    '8814-DeadlyBossMods': { key: '8814-DeadlyBossMods', source: null },
    'deadlybossmods/deadlybossmods': {
      key: 'deadlybossmods/deadlybossmods',
      source: 'github'
    },
    'bigwigsmods/bigwigs/classic': {
      key: 'bigwigsmods/bigwigs/classic',
      source: 'github'
    },
    'antiwinter/dlt': { key: 'antiwinter/dlt', source: 'github' },
    'https://github.com/BigWigsMods/BigWigs/tree/master': {
      source: 'github',
      key: 'BigWigsMods/BigWigs/tree/master'
    },
    'https://github.com/BigWigsMods/BigWigs/tree': {
      source: 'github',
      key: 'BigWigsMods/BigWigs/tree'
    },
    'https://github.com/BigWigsMods/BigWigs': {
      source: 'github',
      key: 'BigWigsMods/BigWigs'
    },
    'https://www.tukui.org/classic-addons.php?id=6': {
      source: 'tukui',
      key: '6'
    }
  }

  for (let k in names) {
    let d = api.parseName(k)

    let r = names[k]

    for (let k2 in r) {
      if (r[k2]) t.assert(r[k2] === d[k2])
      t.assert(!r[k2] === !d[k2])
    }
  }

  t.end()
})
