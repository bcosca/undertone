;((factory) => {
  if (typeof define === 'function' && define.amd) {
    /* AMD; RequireJS */
    define(['tape', '../src/compiler'], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('tape'),
      require('../src/compiler')
    )
  }
})((test, compiler) => {
  'use strict'

  /* eslint-disable no-template-curly-in-string */
  test('Compiler', (t) => {
    // Runtime test suite

    ;(() => {
      let foo = compiler.generate()
      t.ok(
        typeof foo === 'object' &&
        foo.code === '' &&
        typeof foo.map === 'object',
        'no argument is specified'
      )
    })()

    ;(() => {
      let foo = compiler.generate('')
      t.ok(
        typeof foo === 'object' &&
        foo.code === '' &&
        typeof foo.map === 'object',
        'no component defined'
      )
    })()

    ;(() => {
      let foo = compiler.generate('<foo></foo>')
      t.ok(
        typeof foo === 'object' &&
        foo.code === '' && typeof foo.map === 'object',
        'component is empty'
      )
    })()

    ;(() => {
      let foo = compiler.generate('<foo><span>bar</span></foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\n\nthis._render(`<span>bar</span>`, false)\n}\n}\n)\n',
        'component contains HTML'
      )
    })()

    ;(() => {
      let foo = compiler.generate('<foo><script>if (true) {}</script></foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\nif (true) {}\nthis._render(``, false)\n}\n}\n)\n',
        'component contains a script tag'
      )
    })()

    ;(() => {
      let foo = compiler.generate('<foo><style>:root {}</style></foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\n\nthis._render(`<style>:root {}</style>`, false)\n}\n}\n)\n',
        'component contains a style tag'
      )
    })()

    ;(() => {
      let foo = compiler.generate('<foo>${ abc }<script>let abc = 123</script></foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\nlet abc = 123\nthis._render(`${ abc }`, false)\n}\n}\n)\n',
        'component contains ES6 template expression'
      )
    })()

    ;(() => {
      const filename = 'foo.html'
      let foo = compiler.generate('<foo id="bar"></foo>', { filename })
      t.ok(
        foo.code === '' && foo.map.sources.length === 0,
        'no source map generated for empty component (file specified)'
      )
    })()

    ;(() => {
      const filename = 'foo.html'
      let foo = compiler.generate('<foo><script>if (false) {}</script></foo>', { filename })
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\nif (false) {}\nthis._render(``, false)\n}\n}\n)\n' &&
        JSON.stringify(foo.map.sources) === JSON.stringify([filename]),
        'generate source map for component with script tag'
      )
    })()

    ;(() => {
      let foo = compiler.generate('<foo observe="height, width"><bar></bar></foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\nstatic get observedAttributes () {\nreturn [\"height\",\"width\"]\n}\nconstructor () {\nsuper()\n\nthis._render(`<bar></bar>`, false)\n}\n}\n)\n',
        'component with observed attributes'
      )
    })()
    ;(() => {
      let array = [1, 2, 3]
      let foo = compiler.generate('<foo>%each (i in array):<bar></bar>%end</foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\n\nthis._render(`${array.map(function (i) {\nreturn (`<bar></bar>`)}).join(`\\n`)}`, false)\n}\n}\n)\n',
        '%each compiler directive'
      )
    })()
    ;(() => {
      let foo = compiler.generate('<foo>%if (!1):<bar></bar>%end</foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\n\nthis._render(`${!1?`<bar></bar>`:``}`, false)\n}\n}\n)\n',
        '%if compiler directive'
      )
    })()
    ;(() => {
      let foo = compiler.generate('<foo>%if (!1):<bar></bar>%else:<baz></baz>%end</foo>')
      t.ok(
        foo.code === 'window.customElements.define(\n\'foo\',\nclass extends Undertone {\n\nconstructor () {\nsuper()\n\nthis._render(`${!1?`<bar></bar>`:`<baz></baz>`}`, false)\n}\n}\n)\n',
        '%if...else combo compiler directive'
      )
    })()
    ;(() => {
      t.throws(
        () =>{
          let array = ['a', 'b', 'c']
          let foo = compiler.generate('<foo>%each (j in array):<bar></bar>%if (!0):<baz></baz>%end%end%end</foo>')
        },
        /SyntaxError/,
        'unbalanced compiler directives: excessive %end'
      )
    })()
    ;(() => {
      t.throws(
        () =>{
          let array = ['a', 'b', 'c']
          let foo = compiler.generate('<foo>%each (j in array):<bar></bar>%if (!0):<baz></baz>%end</foo>')
        },
        /SyntaxError/,
        'unbalanced compiler directives: missing %end'
      )
    })()
    ;(() => {
      t.throws(
        () =>{
          let foo = compiler.generate('<foo>%eac (x in [1,2 3]):<bar></bar>%end</foo>')
        },
        /SyntaxError/,
        'typo in compiler directive'
      )
    })()
    t.end()
  })
})
