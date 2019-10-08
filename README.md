# undertone.js

A [Custom Elements (v1-spec)](https://html.spec.whatwg.org/multipage/custom-elements.html) code organizer/compiler that tones down Javascript by emphasizing the structure and beauty of HTML.

![GitHub package.json version](https://img.shields.io/github/package-json/v/bcosca/undertone) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](//standardjs.com) ![GitHub](https://img.shields.io/github/license/bcosca/undertone?color=blue)

#### Installation

```shell
npm install --save-dev undertone
```

#### How it works

A custom element definition is nothing more than a self-contained HTML fragment with a custom element tag name that wraps its content, appearance and behavior. Definitions may contain any mix of text, HTML tags, including **`<script>`**, **`<style>`**, **`<link rel="stylesheet">`** and **`<slot>`** tags.

```
<planet-mars>
  <div>${message}</div>
  <script>
    const message = 'Hello, world'
  </script>
</planet-earth>
```

The compiler rebuilds the above structure representing the source code into a reusable Web component that works on any browser aligned with the ES6+ Custom Elements v1 language specs. The following generated code is an approximate translation:

```
customElements.define(
  'planet-mars',
  class extends HTMLElement {
    constructor () {
      super()
      this.attachShadow({ mode: 'open' })
    }
    connectedCallback () {
      const message = 'Hello, world'
      let template = document.createElement('template')
      template.innerHTML = `<div>${message}</div>`
      this.shadowRoot.appendChild(template.content)
    }
  }
)
```

Modern and fairly recent mobile and desktop browsers already have native Javascript ES6+ with Custom Elements capability, so polyfills to augment browser capabilities are unnecessary.

See which browsers support these features here:

* [Javascript ES6+](https://caniuse.com/#search=ecmascript%202015)
* [Custom Elements v1 language spec](https://caniuse.com/#feat=custom-elementsv1)

#### Features

* Clear separation of form and function (content and behavior)
* Simple format, declarative style: regular HTML5 sprinkled with CSS and Javascript
* Easy to read: IDEs/editors already provide syntax highlighting for HTML
* Generation of source maps to help with debugging

#### Putting it all together

Basic document layout

```
./index.html

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <x-foo></x-foo>
    <script src="js/app.js"></script>
  </body>
</html>
```

Example of a component

```
./html/x-foo.html

<x-foo>
  <script>
    console.log('Hello, world')
  </script>
</x-foo>
```

Use the command line tool to compile the component's source code to Javascript and save it to a file.

```
undertone ./html/x-foo.html -m inline -o ./js/app.js
```


#### CLI

```plaintext
USAGE: undertone [options] input-file ...

Basic options:
  -o, --output output-file  Target file (default: stdout)
  -m, --map sourcemap-file  Generate source map (default: none)
  -h, --help                Usage information

Advanced options (see documentation):
  -c, --class class-file    DOM interface (default: undertone.js)
  -g, --global              Enable global styles (default: scoped styles)
  --no-preamble             Exclude preamble from output
```

##### Options

**`-o, --output output-file`**

The name of the generated Javascript file. If omitted, output is sent to **`stdout`**.

**`-m, --map sourcemap-file`**

The name of the source map linked to the output file.

* If the special **`inline`** keyword is supplied as an argument, the source map is generated along with the output.

* Any other value supplied as argument to **`--map`** is treated as a file name.

**`-c, --class class-file`**

The name of the base class that the compiled components will inherit from. By default, **`undertone.js`** generates custom elements that extend the `Undertone` class (contained in `src/undertone.js`). This DOM interface is responsible for rewiring the v1-spec to the [custom element definitions](#how-it-works). Review the source to gain more info before attempting to override it.

**`-g, --global`**

Custom elements do not normally inherit from the document's global stylesheets and style tags by default. Enable this flag to override this behavior.

**`--no-preamble`**

Depending on your build process, you may choose to defer or not include the `Undertone` class in the generated output. Enable this flag to inform the compiler that `src/undertone.js` should not be prepended to the output.


#### Component structure and definition

A custom element definition must have a [valid](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) tag name and it must be declared as a top level HTML element in the source file.

###### Example

```
<my-widget>
  <!-- this is a valid custom element definition -->
</my-widget>
```

> You may have several top level custom elements in one file, although one custom element definition per file is recommended.

###### Anatomy of a component

A custom element definition may contain a mix of HTML and secondary level **`<style>`**, **`<link rel="stylesheet">`** and **`<script>`** tags that work in harmony to define its overall appearance and behavior. Everything inside a custom element definition is optional.

```
<my-widget>
  <link rel="stylesheet" href="stylesheet.css">
  <style light-dom>
    /* Light DOM styles */
  </style>
  <style>
    /* Shadow root styles */
  </style>
  <!--
    HTML tags, text and ES6+ literals
  -->
  <script src="script.js"></script>
  <script>
    /* Component-specific Javascript code */
  </script>
</my-widget>
```

Custom elements may employ an external stylesheet by simply inserting a **`<link>`** tag in the element definition. Styles declared in external stylesheets affect the light DOM.

Styles defined within **`<style>`** tags affect the corresponding CSS properties of either light DOM or shadow root elements, depending on whether the **`light-dom`** attribute is present or not.

**`<slot>`** tags that serve as placeholders for external content may be employed anywhere within the custom element's markup. More information about **`<slot>`** elements is available [here](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Slot).

The presence of an **`observe`** attribute in a custom element declaration tag (e.g. **`<my-widget observe="size">`**) provides a hint to the compiler that the attribute specified should be observed throughout the life span of the element and any change to its value triggers a corresponding component update.

Multiple attributes can be observed by specifying a comma- or space-delimited string representing the attributes to be observed.


#### Undertone class

Code generated by the compiler automatically inherit from the [Undertone class](src/undertone.js) by default. This Javascript class serves as a thin wrapper around the standard **`HTMLElement`** that all custom elements derive from. At compilation time, this class is inserted into the aggregated output as a preamble to satisfy code dependencies.

Under the hood, this little class provides the following services:

* A component caching mechanism to optimize rendering performance
* Automatic synchronization of element attributes and properties
* Redirection of basic v1-spec lifecycle callbacks to synthetic events that can be handled by code inside the component's **`<script>`** tags
* A **`refs`** object for obtaining references to shadow DOM elements
* A compile-time option for scoped or global styles

> The Undertone class is a minimal implementation of a v1-spec DOM interface that provides these services. Being neither a platform nor a framework, it does not enforce any rigid methodology. The philosophy behind Undertone: No overengineered and no opinionated stuff.


##### Events

Undertone events are directly mapped to basic [v1-spec](https://html.spec.whatwg.org/multipage/custom-elements.html) lifecycle callbacks of custom elements. These synthetic events are prefixed with a colon `(:)` to make them easily identifiable.

###### :connect

```
this.addEventListener(':connect', () => {
})
```

The **`:connect`** event handler is called each time the custom element is inserted into the DOM. Its primary job is to prepare the element for subsequent display. When its task is done, the Undertone class assembles the markup inside the component definition and renders the content in the [shadow DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom).

This event fires when the browser's native **`connectedCallBack`** of a custom element is triggered.

###### :ready

```
this.addEventListener(':ready', () => {
})
```

This event occurs when the Web browser is done rendering the component's HTML content. The event handler is responsible for visual tweaks made by changing element properties that are not available before rendering.

###### :update

```
this.addEventListener(':update', () => {
})
```

The **`:update`** event is wired to the native **`attributeChangedCallBack`** method. It fires when the custom element's observed attributes change during its lifecycle.

###### :disconnect

```
this.addEventListener(':disconnect', () => {
})
```

The **`:disconnect`** event maps to the custom element's native **`disconnectedCallBack`** method.


##### Compiler directives

###### %if

The **`%if`** directive renders a block if the specified condition is true.

```
<my-bar>
  %if (age >= 18):
  <span class="green">Have a drink</span>
  %end
  <script>
    const age = 18
  </script>
</my-bar>
```

An optional **`%else`** directive may be inserted to provide a fallback mechanism if needed.

```
<my-bar>
  %if (age > 18):
  <span class="green">Have a drink</span>
  %else if (age === 18)
  <span class="orange">ID please</span>
  %else:
  <span class="red">Go away!</span>
  %end
  <script>
    const age = 18
  </script>
</my-bar>
```

###### %each

Use the **`each`** statement to iterate over a list.

```
<my-list>
  <ul>
    %each (item in items):
    <li>${item}</li>
    %end
  </ul>
  <script>
    const items = [ 'Budweiser', 'Heineken', 'Skol' ]
  </script>
</my-list>
```


#### Contributing

Before you submit a pull request, please check the code base and past issues to avoid duplication.

In addition to improving the project, refactoring code, and implementing features, this project welcomes the following types of contributions:

* Ideas: Participate in an issue thread or start your own to have your voice heard
* Writing: Contribute your expertise in an area by helping expand the documentation
* Copy editing: Fix typos, clarify language, and generally improve the quality of the content
* Formatting: Help keep content easy to read with consistent formatting

###### Testing your code

Please run **`npm test`** to ensure all tests are passing before submitting a pull request - unless you're creating a failing test to increase test coverage or show a problem.


#### Support

Help support further development and maintenance of the **undertone.js** project.

[![Become a Patron!](https://c5.patreon.com/external/logo/become_a_patron_button.png)](https://www.patreon.com/bePatron?u=20757210)


#### License

**undertone.js** is released under the [MIT License](./LICENSE.md)
