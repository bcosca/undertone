;((factory) => {
  const docType = '<!DOCTYPE html>'
  if (typeof define === 'function' && define.amd) {
    // AMD; RequireJS
    define(
      ['jsdom', 'source-map'],
      (jsdom, sourceMap) => {
        const window = new jsdom.JSDOM(docType).window
        return factory(window, sourceMap)
      }
    )
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    const window = new (require('jsdom').JSDOM)(docType).window
    module.exports = factory(window, require('source-map'))
  } else {
    // Browser
    factory(window)
  }
})((window, sourceMap) => {
  'use strict'

  const { document } = window
  const classname = 'Undertone'

  // Compiler directives
  let cmd = {
    /**
     * Array iteration: return equivalent ES6+ literal
     * @return string
     * @param string expr
     * @param string block
     */
    _each: (expr, block) => {
      let match = expr.trim().match(/(.+?)\s+in\s+(.+)/)
      if (match) {
        return (
          '${' + match[2] + '.map(' +
            'function (' + match[1] + ') {\n' +
              'return (`' + block + '`)' +
            '}' +
          ').join(`\\n`)}'
        )
      } else throw new ReferenceError(expr)
    },
    /**
     * Return equivalent ES6+ literal ternary expression
     * @return string
     * @param string expr
     * @param string block
     */
    _if: (expr, block) => {
      let html = '${' + expr + '?'
      let fallback = false
      let match
      while ((match = block.match(/%else(?:\s+if\s*\((.+)\))?\s*:/)) !== null) {
        html += '`' + block.substring(0, match.index).trim() + '`:'
        if (match[1]) html += match[1] + '?'
        else fallback = true
        block = block.substring(match.index + match[0].length)
      }
      return html + '`' + block.trim() + '`' + (fallback ? '' : ':``') + '}'
    }
  }

  function compile (html) {
    let level = 0
    let tree = []
    let match
    while ((match = html.match(/(%end)|(%\w+\s+.*?\s*:)/)) !== null) {
      let content = html.substr(0, match.index)
      tree.push([level, content])
      if (match[2]) {
        // Start of code block
        tree.push([level, match[2]])
        level++
      } else {
        // Roll up to the start of the block
        while (tree[tree.length - 1][0] > level - 1) {
          let branch = tree.pop()
          if (tree.length) {
            let current = tree[tree.length - 1]
            if (current[0] === level - 1) {
              // Start of block found
              let block = current[1].match(/%(\w+)\s+(?:\((.*?)\))?(?=\s*:)/)
              if (block) {
                let fn = cmd['_' + block[1]]
                if (!fn) throw new SyntaxError(block[1])
                tree[tree.length - 1][1] = fn(block[2], branch[1])
                branch[1] = ''
              } else branch[1] += match[1]
            }
            tree[tree.length - 1][1] += branch[1]
          } else throw new SyntaxError(match[1])
        }
        level--
      }
      html = html.substring(match.index + match[0].length)
    }
    tree.push([level, html])
    html = ''
    for (let i = 0; i < tree.length; i++) {
      if (tree[i][0]) throw new SyntaxError(tree[i - 1][1])
      html += tree[i][1]
    }
    return html
  }

  return {
    /**
     * Generate CEv1 code from HTML
     *
     * @return object
     * @param string html
     * @param object options
     */
    generate (html, options) {
      options = options || {}

      /**
       * Disassemble the source code; return an array of source nodes
       *
       * @return array
       * @param string source
       * @param object pos
       */
      function disassemble (source, pos) {
        let nodes = []
        let content = source.match(/(?<=^|\r?\n).*?(\r?\n|$)/g)
        let current = { line: pos.line, col: pos.col }
        for (let k = 0; k < content.length; k++) {
          nodes.push(
            new sourceMap.SourceNode(
              current.line,
              current.col,
              options.filename,
              content[k]
            )
          )
          current = { line: current.line + 1, col: 0 }
        }
        return nodes
      }

      // Output fallback if unable to parse the source code
      let result = { code: '', map: {} }

      if (typeof html === 'string' && html.trim()) {
        let snippet = (
          'window.customElements.define(\n' +
            '\'%NAME\',\n' +
            'class extends %CLASS {\n' +
              '%ATTR\n' +
              'constructor () {\n' +
                'super()\n' +
                '%JS\n' +
                'this._render(`%HTML`, ' + !!options.scoped + ')\n' +
              '}\n' +
            '}\n' +
          ')\n'
        )

        let attr = (
          'static get observedAttributes () {\n' +
            'return %ATTR\n' +
          '}'
        )

        html = html.replace(/`/g, '\\`')

        let node
        if (sourceMap && options.filename) {
          node = new sourceMap.SourceNode()
          node.setSourceContent(options.filename, html)
        }

        let tmp = document.createElement('template')
        tmp.innerHTML = compile(html)

        // Top-level elements define the Web components
        ;[].slice.call(tmp.content.children).forEach((element) => {
          element.innerHTML = element.innerHTML.trimEnd()
          if (element.innerHTML) {
            let name = element.tagName.toLowerCase()

            // Transpile the element
            let observe = element.getAttribute('observe')
            snippet = (
              // Replace placeholders for name and observed attributes
              snippet
                .replace(/%NAME/g, name)
                .replace(/%CLASS/g, options.classname || classname)
                .replace(
                  /%ATTR/g,
                  observe ? (
                    attr.replace(
                      /%ATTR/g,
                      JSON.stringify(observe.split(/,\s*|\s+/))
                    )
                  ) : ''
                )
            )

            let fn = []
            element.querySelectorAll('script:not([src])')
              .forEach((script) => {
                let js = script.textContent.trim()
                // Get the line and column position of JS in document
                let scope = html.substring(0, html.indexOf(js))
                let pos = {
                  line: (scope.match(/^|\r?\n/g) || []).length,
                  col: (scope.match(/(?<=^|\r?\n).*?$/)[0]).length
                }
                if (js) fn.push({ line: pos.line, col: pos.col, js })
                script.remove()
              })

            // Replace placeholders for markup and JS
            if (sourceMap && options.filename) {
              // Compile the code and assemble the source map
              let re = RegExp('.*?(%\\w+|$)', 'sg')
              let match = snippet.match(re)
              for (let i = 0; i < match.length && match[i]; i++) {
                ;((str) => {
                  let match = str.match(/(.*?)(%\w+|$)/s)
                  if (match[1]) node.add(match[1])
                  switch (match[2]) {
                    case '%HTML':
                      let scope = (
                        html.substring(0, html.indexOf(element.innerHTML))
                      )
                      node.add(
                        disassemble(
                          element.innerHTML,
                          {
                            line: (scope.match(/^|\r?\n/g) || []).length,
                            col: (scope.match(/(?<=^|\r?\n).*?$/)[0]).length
                          }
                        )
                      )
                      break
                    case '%JS':
                      for (let j in fn) {
                        node.add(
                          disassemble(
                            fn[j].js,
                            { line: fn[j].line, col: fn[j].col }
                          )
                        )
                      }
                  }
                })(match[i])
              }
            } else {
              // Browser environment: Generate code without source map
              let js = ''
              for (let i in fn) js += fn[i].js
              result.code = (
                snippet
                  .replace(/%HTML/, element.innerHTML)
                  .replace(/%JS/, js)
              )
            }
          }
        })

        if (node) {
          // Spit out the source code and the source map
          result = node.toStringWithSourceMap()
          // Simplify mozilla/source-map output
          result.map = JSON.parse(result.map.toString())
        }
      }

      return result
    }
  }
})
