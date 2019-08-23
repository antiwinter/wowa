const yaz = require('yauzl')
const path = require('path')
const mk = require('mkdirp')
const fs = require('fs')

const log = console.log

module.exports = (src, dst, done) => {
  yaz.open(src, { lazyEntries: true }, (err, f) => {
    if (err) throw err
    f.readEntry()
    f.on('entry', ent => {
      if (/\/$/.test(ent.fileName)) {
        // log('...', path.join(dst, ent.fileName))
        mk(path.join(dst, ent.fileName), err => {
          f.readEntry()
        })
      } else {
        // file entry
        // log('  |', path.join(dst, ent.fileName))
        f.openReadStream(ent, (err, rs) => {
          if (err) throw err

          rs.pipe(fs.createWriteStream(path.join(dst, ent.fileName))).on(
            'close',
            () => {
              f.readEntry()
            }
          )
        })
      }
    }).on('end', done)
  })
}
