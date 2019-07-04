import ava from 'ava'
import core from './core'
import api from './source'
import fs from 'fs'
import g from 'got'
import ext from 'file-type'

const log = console.log

function checkZip(link, done) {
  try {
    let s = g
      .stream(link)
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

function testInfo(key) {
  ava.cb('info::' + key, t => {
    api.info(core.parseName(key), info => {
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

      checkZip(info.version[0].link, res => {
        t.assert(res && res.mime === 'application/zip')
        checkZip(info.version[1].link, res => {
          t.assert(res && res.mime === 'application/zip')
          t.end()
        })
      })
    })
  })
}

testInfo('curse:deadly-boss-mods')
testInfo('wowinterface:8814-DeadlyBossMods')
testInfo('deadlybossmods/deadlybossmods')
