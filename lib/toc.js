const fs = require('fs')
const log = console.log

module.exports = {
  parse(path) {
    let src = fs.readFileSync(path, 'utf-8')
    let toc = { lua: [], xml: [] }

    src
      .split('\r')
      .map(x => x.trim())
      .forEach(line => {
        line = line.trim()

        if (line.match(/^##/)) {
          let pair = line
            .substring(2)
            .split(':')
            .map(x => x.trim())

          if (!pair[1]) return

          toc[pair[0]] =
            pair[0] === 'Dependencies' || pair[0] === 'SavedVariables'
              ? pair[1].split(',').map(x => x.trim())
              : pair[1]
        } else if (line.match(/^#/)) return
        else if (line.match(/\.lua/)) {
          toc.lua.push(line)
        } else if (line.match(/\.xml/)) {
          toc.xml.push(line)
        }
      })

    return toc
  }
}
