# meanie-angular-form-controls

[![npm version](https://img.shields.io/npm/v/meanie-angular-form-controls.svg)](https://www.npmjs.com/package/meanie-angular-form-controls)
[![node dependencies](https://david-dm.org/meanie/angular-form-controls.svg)](https://david-dm.org/meanie/angular-form-controls)
[![github issues](https://img.shields.io/github/issues/meanie/angular-form-controls.svg)](https://github.com/meanie/angular-form-controls/issues)
[![codacy](https://img.shields.io/codacy/94eeaafada4e4e7ebc9f1689f151c4e7.svg)](https://www.codacy.com/app/meanie/angular-form-controls)
[![Join the chat at https://gitter.im/meanie/meanie](https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg)](https://gitter.im/meanie/meanie?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

A set of form control components for Angular 1 (select box, check boxes, radio buttons)

![Meanie](https://raw.githubusercontent.com/meanie/meanie/master/meanie-logo-full.png)

## Installation

You can install this package using `npm`:

```shell
npm install meanie-angular-form-controls --save
```

Include the script `node_modules/meanie-angular-form-controls/release/meanie-angular-form-controls.js` in your build process, or add it via a `<script>` tag to your `index.html`:

```html
<script src="node_modules/meanie-angular-form-controls/release/meanie-angular-form-controls.js"></script>
```

Add `FormControls.Component` as a dependency for your app.

## Styling

These form controls don’t come with styling included, so you will have to supply your own styling. An [example is included in the source code](https://github.com/meanie/angular-form-controls/blob/master/src/example.scss).

## Usage

The form controls which take an array as options, support both simple options and complex (object) options. The examples below use the following option arrays:

```js
//Simple options, an array with string or numeric values
let simple = ['Option 1', 'Option 2', 'Option 3'];

//Complex options, an array with objects
let complex = [
  {
    id: 1,
    name: 'Option 1'
  },
  {
    id: 2,
    name: 'Option 2'
  },
  {
    id: 3,
    name: 'Option 3'
  }
];
```

### Radio buttons

Simple options, tracked by option value (e.g. `Option 1`, `Option 2`, ...):

```html
<radio-buttons
  options="simple"
  ng-model="model"
  on-change="updateModel(value)"
></radio-buttons>
```

Simple options, tracked by index of option in array (e.g. `0`, `1`, ...):

```html
<radio-buttons
  options="simple"
  ng-model="model"
  track-by="$index"
  on-change="updateModel(value)"
></radio-buttons>
```

Simple options, disabled:

```html
<radio-buttons
  options="simple"
  ng-model="model"
  ng-disabled="true"
  on-change="updateModel(value)"
></radio-buttons>
```

Simple options, required:

```html
<radio-buttons
  name="fieldName"
  options="simple"
  ng-model="model"
  ng-required="true"
  on-change="updateModel(value)"
></radio-buttons>
```

Complex options, tracked by index of option in array (e.g. `0`, `1`, ...):

```html
<radio-buttons
  options="complex"
  ng-model="model"
  track-by="$index"
  label-by="name"
  on-change="updateModel(value)"
></radio-buttons>
```

Complex options, tracked by ID property value (e.g. `1`, `2`, ...):

```html
<radio-buttons
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  on-change="updateModel(value)"
></radio-buttons>
```

Complex options, tracked by ID property value, but returned as object:

```html
<radio-buttons
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  as-object="true"
  on-change="updateModel(value)"
></radio-buttons>
```

Complex options, tracked by ID property value, nullable with specified null value and label:

```html
<radio-buttons
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  is-nullable="true"
  null-label="'None'"
  null-value="0"
  on-change="updateModel(value)"
></radio-buttons>
```

### Select box

Simple options, tracked by option value (e.g. `Option 1`, `Option 2`, ...):

```html
<select-box
  options="simple"
  ng-model="model"
  on-change="updateModel(value)"
></select-box>
```

Simple options, tracked by index of option in array (e.g. `0`, `1`, ...):

```html
<select-box
  options="simple"
  ng-model="model"
  track-by="$index"
  on-change="updateModel(value)"
></select-box>
```

Simple options, disabled:

```html
<select-box
  options="simple"
  ng-model="model"
  ng-disabled="true"
  on-change="updateModel(value)"
></select-box>
```

Simple options, required:

```html
<select-box
  name="fieldName"
  options="simple"
  ng-model="model"
  ng-required="true"
  on-change="updateModel(value)"
></select-box>
```

Complex options, tracked by index of option in array (e.g. `0`, `1`, ...):

```html
<select-box
  options="complex"
  ng-model="model"
  track-by="$index"
  label-by="name"
  on-change="updateModel(value)"
></select-box>
```

Complex options, tracked by ID property value (e.g. `1`, `2`, ...):

```html
<select-box
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  on-change="updateModel(value)"
></select-box>
```

Complex options, tracked by ID property value, but returned as object:

```html
<select-box
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  as-object="true"
  on-change="updateModel(value)"
></select-box>
```

Complex options, tracked by ID property value, nullable with specified null value and label:

```html
<select-box
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  is-nullable="true"
  null-label="'None'"
  null-value="0"
  on-change="updateModel(value)"
></select-box>
```

### Check boxes

For check boxes, the value passed to the `on-change` handler is always an array of checked values. The model value is also expected to be an array.

Simple options, tracked by option value (e.g. `Option 1`, `Option 2`, ...):

```html
<check-boxes
  options="simple"
  ng-model="model"
  on-change="updateModel(value)"
></check-boxes>
```

Simple options, tracked by index of option in array (e.g. `0`, `1`, ...):

```html
<check-boxes
  options="simple"
  ng-model="model"
  track-by="$index"
  on-change="updateModel(value)"
></check-boxes>
```

Simple options, disabled:

```html
<check-boxes
  options="simple"
  ng-model="model"
  ng-disabled="true"
  on-change="updateModel(value)"
></check-boxes>
```

Simple options, required:

```html
<check-boxes
  name="fieldName"
  options="simple"
  ng-model="model"
  ng-required="true"
  on-change="updateModel(value)"
></check-boxes>
```

Complex options, tracked by index of option in array (e.g. `0`, `1`, ...):

```html
<check-boxes
  options="complex"
  ng-model="model"
  track-by="$index"
  label-by="name"
  on-change="updateModel(value)"
></check-boxes>
```

Complex options, tracked by ID property value (e.g. `1`, `2`, ...):

```html
<check-boxes
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  on-change="updateModel(value)"
></check-boxes>
```

Complex options, tracked by ID property value, but returned as object:

```html
<check-boxes
  options="complex"
  ng-model="model"
  track-by="id"
  label-by="name"
  as-object="true"
  on-change="updateModel(value)"
></check-boxes>
```

### Check box (for boolean values)

Standard:

```html
<check-box
  ng-model="model"
  on-change="updateModel(value)"
>Label for checkbox</check-box>
```

Inverse (e.g. appears checked when model value is `false`):

```html
<check-box
  ng-model="model"
  is-inverse="true"
  on-change="updateModel(value)"
>Label for checkbox</check-box>
```

Disabled:

```html
<check-box
  ng-model="model"
  ng-disabled="true"
  on-change="updateModel(value)"
>Label for checkbox</check-box>
```

Required:

```html
<check-box
  ng-model="model"
  ng-required="true"
  on-change="updateModel(value)"
>Label for checkbox</check-box>
```

## Issues & feature requests

Please report any bugs, issues, suggestions and feature requests in the [meanie-angular-form-controls issue tracker](https://github.com/meanie/angular-form-controls/issues).

## Contributing

Pull requests are welcome! If you would like to contribute to Meanie, please check out the [Meanie contributing guidelines](https://github.com/meanie/meanie/blob/master/CONTRIBUTING.md).

## Credits

* Meanie logo designed by [Quan-Lin Sim](mailto:quan.lin.sim+meanie@gmail.com)

## License
(MIT License)

Copyright 2015-2016, [Adam Buczynski](http://adambuczynski.com)
