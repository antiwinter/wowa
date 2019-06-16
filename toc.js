const fs = require('fs')

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

          toc[pair[0]] = toc[pair[1]].split(',').map(x => x.trim)
        } else if (line.match(/\.lua/)) {
          toc.lua.push(line)
        } else if (line.match(/\.xml/)) {
          toc.xml.push(line)
        }
      })

    return toc
  }
}
