const ck = require('chalk')
const sp = require('sprintf-js').sprintf
const _ = require('underscore')

let cl = {
  i: ck.yellow,
  h: ck.red,
  x: ck.dim,
  i2: ck.blue,
  ls(ents) {
    let max = _.max(ents.map(x => x.length)) + 1

    let n = ents.length

    let cols = Math.floor(process.stdout.columns / max)
    let rows = Math.ceil(n / cols)
    cols = Math.ceil(n / rows)

    let s = ''
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let ent = ents[i + j * rows]
        if (!ent) continue
        s += sp(`%-${max}s`, ent)
      }
      s += '\n'
    }

    return s
  }
}

module.exports = cl
