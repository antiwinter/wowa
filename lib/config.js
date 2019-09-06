const path = require('path')
const fs = require('fs')
const mk = require('mkdirp')

const win = process.platform === 'win32'
const env = process.env
const log = console.log

let cfg = {
  $anyway: 0,
  getPath(cat) {
    let pac = path.join(win ? env.APPDATA : env.HOME, win ? 'wowa' : '.wowa')
    let pag

    if (env.TEST_WOWA) pac = path.join(path.dirname(pac), '.test_wowa')

    let pathFile = path.join(pac, 'wow_path.txt')
    if (fs.existsSync(pathFile)) pag = fs.readFileSync(pathFile, 'utf-8').trim()
    else {
      if (env.TEST_WOWA) pag = path.join(pac, '.test/_retail_')
      else
        pag = path.join(
          win ? 'C:\\Program Files' : '/Applications',
          'World of Warcraft',
          '_retail_'
        )

      mk(pac, err => {
        fs.writeFileSync(pathFile, pag, 'utf-8')
      })
    }

    let mode = path.basename(pag)
    let paths = {
      addon: path.join(pag, 'Interface', 'AddOns'),
      wtf: path.join(pag, 'WTF'),
      wowaads: path.join(pag, 'WTF', 'wowaads.json'),
      pathfile: pathFile,
      tmp: pac,
      mode: mode,
      db: path.join(pac, '.db'),
      update: path.join(pac, '.update')
    }

    return cat in paths ? paths[cat] : pag
  },

  checkPath() {
    let wow = cfg.getPath()
    let e = fs.existsSync(wow)

    // log('checking', wow)
    if (!e) {
      log(
        '\nWoW folder not found, you can specify it by editing the file below:'
      )
      log('\n  ' + cfg.getPath('pathfile') + '\n')
    }

    return e
  },

  getMode() {
    return path.basename(cfg.getPath())
  },

  getGameVersion() {
    let mo = cfg.getMode()
    return mo === '_classic_' ? '1.13.2' : '8.2.0'
  },

  isValidVersion(v) {
    let mo = cfg.getMode()

    return (
      (mo === '_classic_' && v.search('1.') === 0) ||
      (mo === '_retail_' && v.search('1.') !== 0)
    )
  },

  anyway(en) {
    if (!en) return cfg.$anyway
    cfg.$anyway = en
  }
}

module.exports = cfg
