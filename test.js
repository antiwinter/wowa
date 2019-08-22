import ava from 'ava'
import fs from 'fs'
import g from 'got'
import ext from 'file-type'
import vau from 'valid-url'
import mk from 'mkdirp'
import rm from 'rimraf'
import path from 'path'
import _ from 'underscore'

import cfg from './lib/config'
import core from './core'
import api from './source'
import ads from './lib/wowaads'

const log = console.log

function checkZip(link, done) {
  try {
    let s = g
      .stream(link, {
        headers: {
          'user-agent': require('ua-string')
        }
      })
      .on('readable', () => {
        try {
          let chunk = s.read(ext.minimumBytes)
          // if (typeof chunk === 'object') return
          let ex = ext(chunk)
          // log('got', ex, 'from', link)
          s.destroy()

          done(ex)
        } catch (err) {
          // log('inner', err)
          // done()
        }
      })
      .on('error', err => {
        done(err)
      })
  } catch (err) {
    done(err)
  }
}

function testInfo(key, unzip) {
  ava.cb('info::' + key, t => {
    api.info(api.parseName(key), info => {
      // log('gg', info)
      t.assert(info.name.match(/deadly/i))
      // t.is(info.owner, 'MysticalOS')
      t.assert(info.update > 1561424000)
      // t.assert(info.download > 100)
      t.assert(info.version.length > 0)

      info.version.forEach(x => {
        // t.assert(x.game.match(/^[0-9\.]+$/))
        t.assert(x.link.length > 10)
        t.assert(x.name.length > 1)
      })

      if (unzip)
        checkZip(info.version[0].link, res => {
          t.assert(res && res.mime === 'application/zip')
          t.end()
        })
      else t.end()
    })
  })
}

function testSearch(key) {
  ava.cb('search::' + key, t => {
    api.search(api.parseName(key), res => {
      t.assert(res.source)
      t.assert(res.data.length > 0)

      res.data.forEach(x => {
        t.assert(typeof x.name === 'string' && x.name.length > 1)
        t.assert(typeof x.key === 'string' && x.key.length > 1)
        t.assert(typeof x.download === 'number' && x.download > 1)
        t.assert(typeof x.update === 'number' && x.update > 1)
        // t.assert(typeof x.desc === 'string' && x.desc.length > 1)
        t.assert(vau.isUri(x.page))
      })

      t.end()
    })
  })
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

ava.serial.cb('appetizer', t => {
  t.end()
})

function commonTests(aa) {
  ava.serial.cb('add addons', t => {
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
}

commonTests([
  // ['deadlybossmods/deadlybossmods', /^DBM/],
  ['classicon', /^Class/],
  // ['mmoui:11190-Bartender4', /^Bart/],
  ['sellableitemdrops', /^Sella/]
])

// testInfo('curse:deadly-boss-mods', 1)
// testInfo('wowinterface:8814-DeadlyBossMods', fetchMMOUI)
// testInfo('deadlybossmods/deadlybossmods', 1)
// testSearch('curse:deadly')
// testSearch('wowinterface:deadly')
