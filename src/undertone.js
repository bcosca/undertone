/*! Undertone class | MIT License */

/* eslint-disable-next-line no-unused-vars */
class Undertone extends window.HTMLElement {
  // Initialize state
  constructor () {
    super()
    document._undertone || (
      document._undertone = {
        // Internal registry for loaded custom elements
        registry: {}
      }
    )
    // Initialize shadow DOM
    this.attachShadow({ mode: 'open' })
  }

  // Render component
  _render (html, scoped) {
    html &&
    this.addEventListener(':connect', () => {
      const { registry } = document._undertone
      let name = this.tagName.toLowerCase()

      if (!registry[name]) {
        // Parse each custom element definition only once
        registry[name] = (() => {
          // Cache the markup as an HTML template
          let markup = document.createElement('template')
          markup.innerHTML = html

          let scripts = []

          // Parse remote scripts
          markup.content.querySelectorAll('script')
            .forEach((script) => {
              // Replicate the element to execute benign script
              let code = document.createElement('script')
              code.src = script.src
              let ref = script.getAttribute('ref')
              ref && code.setAttribute('ref', ref)
              scripts.push(code)
              script.remove()
            })

          let links = []

          // Parse <link rel="stylesheet"> elements
          markup.content.querySelectorAll('link[rel="stylesheet"][href]')
            .forEach((element) => {
              links.push(element.cloneNode(true))
              element.remove()
            })

          // Combine global/component-defined styles into a single tag
          let style = document.createElement('style')

          if (!scoped) {
            // Apply global styles and markup to shadow DOM
            let sheets = document.styleSheets
            for (let i = 0; i < sheets.length; i++) {
              if (sheets[i].href) {
                // Delegate global stylesheets
                style.textContent += (
                  '@import url(' +
                    JSON.stringify(document.styleSheets[i].href) +
                  ');'
                )
              } else {
                // Delegate global styles
                for (var j = 0; j < sheets[i].cssRules.length; j++) {
                  style.textContent += sheets[i].cssRules[j].cssText
                }
              }
            }
          }

          let imports = []

          // Parse component-defined styles
          markup.content.querySelectorAll('style')
            .forEach((element) => {
              if (element.hasAttribute('light-dom')) {
                imports.push(element.cloneNode(true))
                element.removeAttribute('light-dom')
              } else {
                let match = (
                  element.textContent
                    .match(/@import url\(['"]?.+?['"]?\);?\s*/g)
                )
                if (match) {
                  // @import detected (remote stylesheet)
                  for (let i = 0; i < match.length; i++) {
                    let css = document.createElement('style')
                    css.textContent = match[i].trim()
                    imports.push(css)
                    element.textContent = (
                      element.textContent.replace(match[i], '')
                    )
                  }
                }
                style.textContent += element.textContent
              }
              element.remove()
            })

          return { markup, scripts, links, style, imports }
        })()
      }

      this.refs || (this.refs = {})

      ;['imports', 'links', 'scripts'].forEach((key) => {
        for (let i = 0; i < registry[name][key].length; i++) {
          let element = registry[name][key][i].cloneNode(true)
          // [ref] attribute vanishes when element is cloned
          let ref = registry[name][key][i].getAttribute('ref')
          if (ref) this.refs[ref] = element
          // Attach remote stylesheet to host
          this.appendChild(element)
        }
      })

      // Apply shadow root styles
      this.shadowRoot.appendChild(
        registry[name].style.cloneNode(true)
      )

      // Render markup
      this.shadowRoot.appendChild(
        registry[name].markup.cloneNode(true).content
      )

      // Initialize DOM references
      this.shadowRoot.querySelectorAll('[ref]')
        .forEach((element) => {
          this.refs[element.getAttribute('ref')] = element
          element.removeAttribute('ref')
        })

      // Mirror attributes to element properties
      for (let i = 0; i < this.attributes.length; i++) {
        this[this.attributes[i].name] = this.attributes[i].value
      }

      // Announce
      this.dispatchEvent(new window.CustomEvent(':ready'))
    })
  }

  // Invoke when element is inserted into the DOM
  connectedCallback () {
    this.dispatchEvent(new window.CustomEvent(':connect'))
  }

  // Invoke when element is removed from the DOM
  disconnectedCallback () {
    this.dispatchEvent(new window.CustomEvent(':disconnect'))
  }

  // Call when observed attribute is added, removed, updated, or replaced
  attributeChangedCallback (key, prior, value) {
    // Mirror the attribute and property
    this[key] = value

    this.dispatchEvent(
      new window.CustomEvent(':update', { detail: { key, value } })
    )
  }
}
