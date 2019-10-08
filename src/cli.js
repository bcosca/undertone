#!/usr/bin/env node

;(() => {
  const json = require('../package.json')
  const compiler = require('./compiler')

  // External dependencies
  const fs = require('fs')
  const encoding = 'utf8'
  const path = require('path')
  const sourceMap = require('source-map')
  const window = new (require('jsdom').JSDOM)('<!DOCTYPE html>').window

  let options = {
    primitive: path.join(__dirname, 'undertone.js'),
    scoped: true
  }
  let files = []

  let args = process.argv.slice(2)
  let arg
  while ((arg = args.shift())) {
    let alias = {
      '-o': '--output',
      '-m': '--map',
      '-g': '--global',
      '-c': '--class',
      '-h': '--help',
      '-v': '--version'
    }
    if (alias[arg]) arg = alias[arg]
    switch (arg) {
      case '--output':
        options.out = args.shift()
        break
      case '--map':
        options.map = args.shift()
        break
      case '--class':
        options.primitive = args.shift()
        break
      case '--global':
        options.scoped = false
        break
      case '--no-preamble':
        options.exclude = true
        break
      case '--help':
        options.help = true
        break
      case '--version':
        options.version = true
        break
      default:
        files.push(arg)
    }
  }

  if (options.help || !process.argv.slice(2).length) {
    // Display help screen
    console.log(
      'USAGE: ' + json.name + ' [options] input-file ...\n' +
      '\n' +
      'Basic options:\n' +
      '  -o, --output output-file  Target file (default: stdout)\n' +
      '  -m, --map sourcemap-file  Generate source map (default: none)\n' +
      '                            Use \'inline\' to create an inline source map\n' +
      '  -h, --help                Usage information\n' +
      '  -v, --version             Version\n' +
      '\n' +
      'Advanced options (see documentation):\n' +
      '  -c, --class class-file    DOM interface (default: undertone.js)\n' +
      '  -g, --global              Enable global styles (default: scoped styles)\n' +
      '  --no-preamble             Exclude preamble from output\n' +
      '\n'
    )
  } else if (options.version) {
    console.log(
      `${json.name} ${json.version}\n` +
      '\n'
    )
  } else {
    ;(async () => {
      let preamble = fs.readFileSync(options.primitive, encoding).toString()
      let match = preamble.match(/(?<=class ).+?(?= extends)/)
      let classname
      if (!match) throw new Error('No DOM interface found')
      classname = match[0]

      let content = ''

      let node
      if (options.map) node = new sourceMap.SourceNode()

      if (!options.exclude) {
        // Insert preamble
        content = preamble
        if (options.map) node.add(content)
      }

      // Process input files
      for (let i = 0; i < files.length; i++) {
        let code = fs.readFileSync(files[i], encoding)
        // Retrieve transpiled code and source map
        let result = (
          compiler.generate(
            code,
            { filename: files[i], scoped: options.scoped, classname }
          )
        )
        content += result.code
        // Feed the transpiled code to the source map engine
        if (options.map && result.map.mappings) {
          let consumer = await new sourceMap.SourceMapConsumer(result.map)
          node.add(
            sourceMap.SourceNode
              .fromStringWithSourceMap(result.code, consumer)
          )
          consumer.destroy()
        }
      }

      if (options.map) {
        // Generate the aggregated source map
        content += '\n//# sourceMappingURL='
        let gen = node.toStringWithSourceMap().map.toString()
        if (options.map === 'inline') {
          content += (
            'data:application/json;charset=utf-8;base64,' + window.btoa(gen)
          )
        } else {
          content += options.map.replace(/^.+\//, '')
          fs.writeFileSync(options.map, gen)
        }
      }
      // Send to designated output
      if (options.out) fs.writeFileSync(options.out, content)
      else console.log(content || '')
    })()
  }
})()
