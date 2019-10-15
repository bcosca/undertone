;((factory) => {
  const docType = '<!DOCTYPE html>'
  if (typeof define === 'function' && define.amd) {
    /* AMD; RequireJS */
    define(
      ['tape', 'jsdom', 'source-map', 'fs', 'glob', 'child_process'],
      (test, jsdom, sourceMap, fs, glob, cproc) => {
        const window = new jsdom.JSDOM(docType).window
        return factory(test, window, sourceMap, fs, glob, cproc)
      }
    )
  } else if (typeof module === 'object' && module.exports) {
    /* CommonJS */
    const window = new (require('jsdom').JSDOM)(docType).window
    module.exports = factory(
      require('tape'),
      window,
      require('source-map'),
      require('fs'),
      require('glob'),
      require('child_process')
    )
  }
})((test, window, sourceMap, fs, glob, cproc) => {
  'use strict'

  const { execSync } = cproc
  const dir = 'tests/tags/'
  const tmp = 'tests/tmp/'
  const cmd = 'node src/cli.js'

  test('CLI', async (t) => {
    // CLI test suite

    ;(() => {
      t.ok(
        /USAGE:/.test(
          execSync(cmd + ' --help').toString()
        ),
        'display help'
      )
    })()

    ;(() => {
      t.ok(
        /class Undertone extends/.test(
          execSync(cmd + ` ${dir}x-foo.html`).toString()
        ),
        'send output to stdout'
      )
    })()

    ;(() => {
      t.ok(
        !/this._render\(.+?, false\)/.test(
          execSync(cmd + ` --global ${dir}x-foo.html`).toString()
        ),
        'generate component with global styles'
      )
    })()

    ;(() => {
      t.ok(
        !/class Undertone extends/.test(
          execSync(cmd + ` --no-preamble ${dir}x-foo.html`).toString()
        ),
        'output Javascript code without the preamble'
      )
    })()

    ;(() => {
      glob.sync(`${tmp}*.min.js{,.map}`).forEach((file) => {
        fs.unlinkSync(file)
      })
      execSync(cmd + ` -o ${tmp}test.min.js ${dir}*.html`)
      t.ok(
        /class Undertone extends/.test(
          fs.readFileSync(`${tmp}test.min.js`, 'utf8')
        ),
        'output to file'
      )
    })()

    ;(() => {
      glob.sync(`${tmp}*.min.js{,.map}`).forEach((file) => {
        fs.unlinkSync(file)
      })
      t.ok(
        /\/\/# sourceMappingURL=.*?test.html.js.map/.test(
          execSync(cmd + ` -m ${tmp}test.html.js.map ${dir}*.html`).toString()
        ),
        'generate external source map'
      )
    })()

    ;(() => {
      glob.sync(`${tmp}test.html.js{,.map}`).forEach((file) => {
        fs.unlinkSync(file)
      })
      t.ok(
        /\/\/# sourceMappingURL=data:application\/json/.test(
          execSync(cmd + ` -m inline ${dir}*.html`).toString()
        ),
        'generate inline source map'
      )
    })()

    await (async () => {
      let result = execSync(cmd + ` -m inline ${dir}*.html`).toString()
      let b64 = result.match(/(?<=data:application\/json;charset=utf-8;base64,).+/g)
      let map = JSON.parse(window.atob(b64))
      let consumer = await new sourceMap.SourceMapConsumer(map)
      t.ok(
        consumer.hasContentsOfAllSources(),
        'ensure generated source map retains the source code'
      )
    })()

    ;(() => {
      t.ok(
        /class Undertone extends window.HTMLElement/.test(
          execSync(cmd + ` --class src/undertone.js ${dir}*.html`).toString()
        ),
        'component with custom class'
      )
    })()

    t.end()
  })
})
