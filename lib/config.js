const path = require('path')
const fs = require('fs')

const win = process.platform === 'win32'
const env = process.env
const log = console.log

let cfg = {
  getPath(cat) {
    let pathFile = path.join(
      win ? env.APPDATA : env.HOME,
      win ? 'wowa' : '.wowa',
      'wow_path.txt'
    )
    let base

    if (fs.existsSync(pathFile))
      base = fs.readFileSync(pathFile, 'utf-8').trim()
    else {
      base = path.join(
        win ? 'C:\\Program Files' : '/Applications',
        'World of Warcraft',
        '_retail_'
      )

      mk(path.dirname(pathFile), err => {
        fs.writeFileSync(pathFile, base, 'utf-8')
      })
    }

    let mode = path.basename(base)

    switch (cat) {
      case 'addon':
        return path.join(base, 'Interface', 'AddOns')
      case 'wtf':
        return path.join(base, 'WTF')
      case 'wowaads':
        return path.join(base, 'WTF', 'wowaads.json')
      case 'pathfile':
        return pathFile
      case 'tmp':
        return path.dirname(pathFile)
      case 'mode':
        return mode
      case 'db':
        return path.join(path.dirname(pathFile), '.db')
    }

    return base
  },

  checkPath() {
    let wow = cfg.getPath()
    let e = fs.existsSync(wow)

    // log('checking', wow)
    if (!e) {
      log(
        '\nWoW folder not found, you can specify it by editing the file below:'
      )
      log('\n  ' + getPath('pathfile') + '\n')
    }

    return e
  },

  getDB() {
    let p = cfg.getPath('db')
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null
  },

  getMode() {
    return path.basename(cfg.getPath())
  }
}

module.exports = cfg
