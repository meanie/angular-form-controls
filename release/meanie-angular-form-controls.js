/**
 * meanie-angular-form-controls - v1.0.1 - 27-5-2016
 * https://github.com/meanie/angular-form-controls
 *
 * Copyright (c) 2016 Adam Buczynski <me@adambuczynski.com>
 * License: MIT
 */
'use strict';

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('FormControls.Component', ['CheckBox.Component', 'CheckBoxes.Component', 'RadioButtons.Component', 'SelectBox.Component'])

  /**
   * Helper service
   */
  .factory('$formControls', function () {
    return {

      /**
       * Check if an item value really changed (deep checking with angular.equals)
       */

      hasChanged: function hasChanged(changes) {

        //Get previous and current value
        var previousValue = changes.previousValue;
        var currentValue = changes.currentValue;

        //If unitialized, don't trigger changes

        if (previousValue === 'UNINITIALIZED_VALUE') {
          return false;
        }

        //Check if equals
        return !angular.equals(previousValue, currentValue);
      }
    };
  });
})(window, window.angular);
'use strict';

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('CheckBox.Component', [])

  /**
   * Checkbox component
   */
  .component('checkBox', {
    template: '\n    <label class="check-box"\n      ng-transclude\n      ng-click="$ctrl.toggle()"\n      ng-class="{checked: $ctrl.isChecked(), disabled: $ctrl.isDisabled}"\n    ></label>\n  ',
    require: {
      ngModel: 'ngModel'
    },
    transclude: true,
    bindings: {
      model: '<ngModel',
      onChange: '&',
      isInverse: '<isInverse',
      isDisabled: '<ngDisabled',
      isRequired: '<ngRequired'
    },

    /**
     * Component controller
     */
    controller: ['$element', '$formControls', function controller($element, $formControls) {

      //Get instance
      var $ctrl = this;

      /**
       * On init
       */
      this.$onInit = function () {

        //Add checkbox wrapper class to parent component
        $element.addClass('checkbox-wrapper');

        //Empty check override in order for ng-required to work properly
        this.ngModel.$isEmpty = function () {
          if ($ctrl.isInverse) {
            return !!$ctrl.model;
          }
          return !$ctrl.model;
        };
      };

      /**
       * On change
       */
      this.$onChanges = function (changes) {

        //Validate and mark as dirty if needed
        if (changes.model) {
          this.ngModel.$validate();
          if ($formControls.hasChanged(changes.model)) {
            this.ngModel.$setDirty();
          }
        }
      };

      /**
       * Toggle
       */
      this.toggle = function () {

        //Don't toggle when disabled
        if (this.isDisabled) {
          return;
        }

        //Get boolean value and call on change handler
        var value = !this.model;
        this.onChange({ value: value });
      };

      /**
       * Check if checked
       */
      this.isChecked = function () {
        return this.isInverse ? !this.model : !!this.model;
      };
    }]
  });
})(window, window.angular);
'use strict';

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('CheckBoxes.Component', [])

  /**
   * Checkboxes component
   */
  .component('checkBoxes', {
    template: '\n    <div class="check-box-group {{$ctrl.classes}}">\n      <label class="check-box"\n        ng-repeat="option in $ctrl.options"\n        ng-click="$ctrl.toggle(option, $index)"\n        ng-class="{checked: $ctrl.isChecked(option, $index), disabled: $ctrl.isDisabled}"\n      >{{$ctrl.getLabel(option)}}</label>\n    </div>\n  ',
    require: {
      ngModel: 'ngModel'
    },
    bindings: {
      model: '<ngModel',
      options: '<',
      onChange: '&',
      isDisabled: '<ngDisabled',
      isRequired: '<ngRequired'
    },

    /**
     * Component controller
     */
    controller: ['$element', '$attrs', '$log', '$formControls', function controller($element, $attrs, $log, $formControls) {

      //Helper vars
      var $ctrl = this;
      var labelBy = $attrs.labelBy || null;
      var trackBy = $attrs.trackBy || null;
      var asObject = $attrs.asObject === 'true';

      /**
       * Helper to get the tracking value of an option
       */
      function getTrackingValue(option, index) {

        //Tracking by index?
        if (trackBy === '$index') {
          return index;
        }

        //Non object? Track by its value
        if (!angular.isObject(option)) {
          return option;
        }

        //Must have tracking property
        if (!trackBy) {
          $log.warn('Missing track-by property for check boxes');
          return null;
        }

        //Validate property
        if (typeof option[trackBy] === 'undefined') {
          $log.warn('Unknown property `' + trackBy + '` for check box tracking');
          return null;
        }

        //Return the property
        return option[trackBy];
      }

      /**
       * Get label value of an option
       */
      function getLabelValue(option) {

        //Non object? Use its value
        if (!angular.isObject(option)) {
          return option;
        }

        //Must have label property
        if (!labelBy) {
          $log.warn('Missing label-by property for check boxes');
          return '';
        }

        //Validate property
        if (typeof option[labelBy] === 'undefined') {
          $log.warn('Unknown property `' + labelBy + '` for check box label');
          return '';
        }

        //Return the property
        return option[labelBy];
      }

      /**
       * Check if a certain option is checked
       */
      function isChecked(model, option, index) {

        //Nothing selected?
        if (!angular.isArray(model) || model.length === 0) {
          return false;
        }

        //Get the model and option values
        var optionValue = getTrackingValue(option, index);
        var modelValues = model.map(function (modelValue) {
          if (asObject && angular.isObject(modelValue)) {
            return getTrackingValue(modelValue);
          }
          return modelValue;
        });

        //See if present in model values
        var find = modelValues.find(function (modelValue) {
          return modelValue === optionValue;
        });
        return typeof find !== 'undefined';
      }

      /**
       * Initialization
       */
      this.$onInit = function () {

        //Check configuration
        if (asObject && trackBy === '$index') {
          $log.warn('Cannot track check boxes by index if model is an object');
          asObject = false;
        }

        //Propagate classes
        this.classes = $element[0].className;
        $element[0].className = '';

        //Empty check override in order for ng-required to work properly
        this.ngModel.$isEmpty = function () {

          //Needed here to prevent $validate from setting the model to undefined
          $ctrl.ngModel.$$setOptions({
            allowInvalid: true
          });

          //Return check now
          return !angular.isArray($ctrl.model) || $ctrl.model.length === 0;
        };
      };

      /**
       * On change
       */
      this.$onChanges = function (changes) {

        //Must have array as options
        if (!angular.isArray(this.options)) {
          this.options = [];
        }

        //Validate and mark as dirty if needed
        if (changes.model) {
          this.ngModel.$validate();
          if ($formControls.hasChanged(changes.model)) {
            this.ngModel.$setDirty();
          }
        }
      };

      /**
       * Get label value of an option
       */
      this.getLabel = function (option) {
        return getLabelValue(option);
      };

      /**
       * Check if given option is checked
       */
      this.isChecked = function (option, index) {
        return isChecked(this.model, option, index);
      };

      /**
       * Toggle an option
       */
      this.toggle = function (option, index) {

        //Ignore when disabled
        if (this.isDisabled) {
          return;
        }

        //Initialize value of our model array
        var value = [];
        if (angular.isArray(this.model)) {
          value = this.model.map(function (item) {
            return item;
          });
        }

        //Check if currently checked (use source model) and get the item value
        var checked = isChecked(value, option, index);
        var item = asObject ? option : getTrackingValue(option, index);

        //If checked, remove from target model, otherwise add
        if (checked) {
          var i = value.indexOf(item);
          value.splice(i, 1);
        } else {
          value.push(item);
        }

        //Call on change handler
        this.onChange({ value: value });
      };
    }]
  });
})(window, window.angular);
'use strict';

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('RadioButtons.Component', [])

  /**
   * Radio buttons component
   */
  .component('radioButtons', {
    template: '\n    <div class="radio-button-group {{$ctrl.classes}}">\n      <label class="radio-button"\n        ng-if="$ctrl.isNullable"\n        ng-click="$ctrl.select(null)"\n        ng-class="{checked: $ctrl.isSelected(null), disabled: $ctrl.isDisabled}"\n      >{{$ctrl.nullLabel}}</label>\n      <label class="radio-button"\n        ng-repeat="option in $ctrl.options"\n        ng-click="$ctrl.select(option, $index)"\n        ng-class="{checked: $ctrl.isSelected(option, $index), disabled: $ctrl.isDisabled}"\n      >{{$ctrl.getLabel(option)}}</label>\n    </div>\n  ',
    require: {
      ngModel: 'ngModel'
    },
    bindings: {
      model: '<ngModel',
      options: '<',
      onChange: '&',
      isNullable: '<',
      nullValue: '<',
      nullLabel: '<',
      isDisabled: '<ngDisabled',
      isRequired: '<ngRequired'
    },

    /**
     * Component controller
     */
    controller: ['$element', '$attrs', '$log', '$formControls', function controller($element, $attrs, $log, $formControls) {

      //Helper vars
      var $ctrl = this;
      var labelBy = $attrs.labelBy || null;
      var trackBy = $attrs.trackBy || null;
      var asObject = $attrs.asObject === 'true';

      /**
       * Helper to get the tracking value of an option
       */
      function getTrackingValue(option, index) {

        //Null value?
        if (option === null) {
          return $ctrl.nullValue;
        }

        //Tracking by index?
        if (trackBy === '$index') {
          return index;
        }

        //Non object? Track by its value
        if (!angular.isObject(option)) {
          return option;
        }

        //Must have tracking property
        if (!trackBy) {
          $log.warn('Missing track-by property for radio buttons');
          return null;
        }

        //Validate property
        if (typeof option[trackBy] === 'undefined') {
          $log.warn('Unknown property `' + trackBy + '` for radio tracking');
          return null;
        }

        //Return the property
        return option[trackBy];
      }

      /**
       * Get the model value
       */
      function getModelValue(option, index) {

        //If nullable and null option given, return null value
        if ($ctrl.isNullable && option === null) {
          return $ctrl.nullValue;
        }

        //If returning as object, return the selected option
        if (asObject) {
          return option;
        }

        //Otherwise, return the tracking value of the given option
        return getTrackingValue(option, index);
      }

      /**
       * Get label value of an option
       */
      function getLabelValue(option) {

        //Null value?
        if (option === null) {
          return $ctrl.nullLabel;
        }

        //Non object? Use its value
        if (!angular.isObject(option)) {
          return option;
        }

        //Must have label property
        if (!labelBy) {
          $log.warn('Missing label-by property for selectbox');
          return '';
        }

        //Validate property
        if (typeof option[labelBy] === 'undefined') {
          $log.warn('Unknown property `' + labelBy + '` for selectbox label');
          return '';
        }

        //Return the property
        return option[labelBy];
      }

      /**
       * Check if a certain option is selected
       */
      function isSelected(option, index) {

        //Nullable and null value selected?
        if ($ctrl.isNullable && $ctrl.model === $ctrl.nullValue && option === null) {
          return true;
        }

        //Nothing selected?
        if ($ctrl.model === null) {
          return false;
        }

        //Get the model and option values
        var modelValue = $ctrl.model;
        var optionValue = getTrackingValue(option, index);

        //If the model is an object, get its tracking value
        if (asObject && angular.isObject($ctrl.model)) {
          modelValue = getTrackingValue($ctrl.model);
        }

        //Compare the two
        return modelValue === optionValue;
      }

      /**
       * Initialization
       */
      this.$onInit = function () {

        //Check configuration
        if (asObject && trackBy === '$index') {
          $log.warn('Cannot track radio buttons by index if model is an object');
          asObject = false;
        }

        //Propagate classes
        this.classes = $element[0].className;
        $element[0].className = '';

        //Empty check override in order for ng-required to work properly
        this.ngModel.$isEmpty = function () {
          if ($ctrl.isNullable) {
            return $ctrl.model === $ctrl.nullValue;
          }
          return $ctrl.model === null || typeof $ctrl.model === 'undefined';
        };
      };

      /**
       * On change
       */
      this.$onChanges = function (changes) {

        //Must have array as options
        if (!angular.isArray(this.options)) {
          this.options = [];
        }

        //Set default null value/label if not set
        if (typeof this.nullValue === 'undefined') {
          this.nullValue = null;
        }
        if (typeof this.nullLabel === 'undefined') {
          this.nullLabel = 'None';
        }

        //Set model to null value if not defined or null
        if (this.isNullable) {
          if (this.model === null || typeof this.model === 'undefined') {
            this.model = this.nullValue;
          }
        }

        //Validate and mark as dirty if needed
        if (changes.model) {
          this.ngModel.$validate();
          if ($formControls.hasChanged(changes.model)) {
            this.ngModel.$setDirty();
          }
        }
      };

      /**
       * Get label value of an option
       */
      this.getLabel = function (option) {
        return getLabelValue(option);
      };

      /**
       * Check if given option is selected
       */
      this.isSelected = function (option, index) {
        return isSelected(option, index);
      };

      /**
       * Select an option
       */
      this.select = function (option, index) {

        //Ignore when disabled
        if (this.isDisabled) {
          return;
        }

        //Get the new model value and call on change handler
        var value = getModelValue(option, index);
        this.onChange({ value: value, option: option });
      };
    }]
  });
})(window, window.angular);
'use strict';

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('SelectBox.Component', [])

  /**
   * Selectbox component
   */
  .component('selectBox', {
    template: '\n    <div class="select-box {{$ctrl.classes}}">\n      <div class="form-control-wrapper clickable" ng-click="$ctrl.toggleOptions()">\n        <span class="form-control-spinner" ng-class="{\'show-spinner\': $ctrl.hasSpinner}">\n          <span class="caret"\n            ng-click="$ctrl.toggleOptions(); $event.stopPropagation();"\n            ng-class="{disabled: $ctrl.isDisabled}"\n            ng-if="!$ctrl.hasSpinner"\n          ></span>\n          <input readonly class="form-control" type="text"\n            ng-value="$ctrl.getSelectedLabel()"\n            ng-keydown="$ctrl.keydown($event)"\n            ng-class="{disabled: ($ctrl.isDisabled || $ctrl.hasSpinner)}">\n          <spinner ng-if="$ctrl.hasSpinner"></spinner>\n        </span>\n      </div>\n      <ul class="select-box-options" ng-show="$ctrl.isShowingOptions">\n        <li\n          ng-if="$ctrl.isNullable || !$ctrl.hasOptions()"\n          ng-class="{selected: $ctrl.isSelection(-1)}"\n          ng-mouseover="$ctrl.setSelection(-1)"\n          ng-click="$ctrl.confirmSelection(-1)"\n        >{{$ctrl.nullLabel}}</li>\n        <li\n          ng-transclude\n          ng-repeat="option in $ctrl.options"\n          ng-class="{selected: $ctrl.isSelection($index)}"\n          ng-mouseover="$ctrl.setSelection($index)"\n          ng-click="$ctrl.confirmSelection($index)"\n        >{{$ctrl.getLabel(option)}}</li>\n      </ul>\n    </div>\n  ',
    transclude: true,
    require: {
      ngModel: 'ngModel'
    },
    bindings: {
      model: '<ngModel',
      options: '<',
      onChange: '&',
      isNullable: '<',
      nullValue: '<',
      nullLabel: '<',
      isDisabled: '<ngDisabled',
      isRequired: '<ngRequired',
      hasSpinner: '<hasSpinner'
    },

    /**
     * Component controller
     */
    controller: ['$element', '$attrs', '$log', '$formControls', '$scope', '$document', function controller($element, $attrs, $log, $formControls, $scope, $document) {

      //Helper vars
      var $ctrl = this;
      var selectionIndex = void 0,
          $input = void 0,
          $container = void 0,
          $options = void 0;
      var labelBy = $attrs.labelBy || null;
      var trackBy = $attrs.trackBy || null;
      var asObject = $attrs.asObject === 'true';

      //Keycodes
      var KeyCodes = {
        ENTER: 13,
        ESC: 27,
        SPACE: 32,
        UP: 38,
        DOWN: 40
      };

      /**
       * Ensure the selected option is in view
       */
      function ensureSelectionInView() {

        //Check index
        if (!$ctrl.isNullable && selectionIndex < 0) {
          return;
        }

        //Get option now, taking into account the additional nullable element
        var option = $options[selectionIndex + ($ctrl.isNullable ? 1 : 0)];
        if (!option) {
          return;
        }

        //Determine container and element top and bottom
        var cTop = $container[0].scrollTop;
        var cBottom = cTop + $container[0].clientHeight;
        var eTop = option.offsetTop;
        var eBottom = eTop + option.clientHeight;

        //Check if out of view
        if (eTop < cTop) {
          $container[0].scrollTop -= cTop - eTop;
        } else if (eBottom > cBottom) {
          $container[0].scrollTop += eBottom - cBottom;
        }
      }

      /**
       * Click handler for document
       */
      function documentClickHandler(event) {
        if (!$input[0].contains(event.target) && $ctrl.isShowingOptions) {
          $scope.$apply($ctrl.hideOptions.bind($ctrl));
        }
      }

      /**
       * Move selection up
       */
      function moveSelectionUp() {
        var oldIndex = selectionIndex;
        if (typeof selectionIndex === 'undefined') {
          if ($ctrl.isNullable) {
            selectionIndex = -1;
          } else if ($ctrl.options.length > 0) {
            selectionIndex = $ctrl.options.length - 1;
          }
        } else if (selectionIndex > ($ctrl.isNullable ? -1 : 0)) {
          selectionIndex--;
        }
        if (oldIndex !== selectionIndex) {
          ensureSelectionInView();
        }
      }

      /**
       * Move selection down
       */
      function moveSelectionDown() {
        var oldIndex = selectionIndex;
        if (typeof selectionIndex === 'undefined') {
          if ($ctrl.isNullable) {
            selectionIndex = -1;
          } else if ($ctrl.options.length > 0) {
            selectionIndex = 0;
          }
        } else if (selectionIndex < $ctrl.options.length - 1) {
          selectionIndex++;
        }
        if (oldIndex !== selectionIndex) {
          ensureSelectionInView();
        }
      }

      /**
       * Helper to get the tracking value of an option
       */
      function getTrackingValue(option, index) {

        //Null value?
        if (option === null) {
          return $ctrl.nullValue;
        }

        //Tracking by index?
        if (trackBy === '$index') {
          return index;
        }

        //Non object? Track by its value
        if (!angular.isObject(option)) {
          return option;
        }

        //Must have tracking property
        if (!trackBy) {
          $log.warn('Missing track-by property for select box');
          return $ctrl.nullValue;
        }

        //Validate property
        if (typeof option[trackBy] === 'undefined') {
          $log.warn('Unknown property `' + trackBy + '` for select box tracking');
          return $ctrl.nullValue;
        }

        //Return the property
        return option[trackBy];
      }

      /**
       * Get the model value
       */
      function getModelValue(option, index) {

        //If nullable and null option given, return null value
        if ($ctrl.isNullable && option === null) {
          return $ctrl.nullValue;
        }

        //If returning as object, return the selected option
        if (asObject) {
          return option;
        }

        //Otherwise, return the tracking value of the given option
        return getTrackingValue(option, index);
      }

      /**
       * Get label value of an option
       */
      function getLabelValue(option) {

        //Null value?
        if (option === null || typeof option === 'undefined') {
          return $ctrl.nullLabel;
        }

        //Non object? Use its value
        if (!angular.isObject(option)) {
          return option;
        }

        //Must have label property
        if (!labelBy) {
          $log.warn('Missing label-by property for select box');
          return '';
        }

        //Validate property
        if (typeof option[labelBy] === 'undefined') {
          $log.warn('Unknown property `' + labelBy + '` for select box label');
          return '';
        }

        //Return the property
        return option[labelBy];
      }

      /**
       * Find the selected option based on the model value
       */
      function findOption(model, options) {

        //Nothing selected or null value selected?
        if (typeof model === 'undefined' || model === $ctrl.nullValue) {
          return null;
        }

        //Tracking by index?
        if (trackBy === '$index') {
          if (typeof options[model] !== 'undefined') {
            return options[model];
          }
          return null;
        }

        //Get the model value
        //If the model is an object, get its tracking value
        var modelValue = model;
        if (asObject && angular.isObject(model)) {
          modelValue = getTrackingValue(model);
        }

        //Find matching option
        return options.find(function (option, index) {
          var optionValue = getTrackingValue(option, index);
          return modelValue === optionValue;
        });
      }

      /**
       * Initialization
       */
      this.$onInit = function () {

        //Check configuration
        if (asObject && trackBy === '$index') {
          $log.warn('Cannot track select box by index if model is an object');
          asObject = false;
        }

        //Initialize flags
        this.isShowingOptions = false;

        //Propagate classes
        this.classes = $element[0].className;
        $element[0].className = '';

        //Find some elements
        $input = $element.find('input');
        $container = $input.parent().next();
        $options = $container.find('li');

        //Apply document click handler
        $document.on('click', documentClickHandler);

        //Empty check override in order for ng-required to work properly
        this.ngModel.$isEmpty = function () {
          if ($ctrl.isNullable) {
            return $ctrl.model === $ctrl.nullValue;
          }
          return $ctrl.model === null || typeof $ctrl.model === 'undefined';
        };
      };

      /**
       * Destroy
       */
      this.$onDestroy = function () {
        $document.off('click', documentClickHandler);
      };

      /**
       * On change
       */
      this.$onChanges = function (changes) {

        //Must have array as options
        if (!angular.isArray(this.options)) {
          this.options = [];
        }

        //Set default null value/label if not set
        if (typeof this.nullValue === 'undefined') {
          this.nullValue = null;
        }
        if (typeof this.nullLabel === 'undefined') {
          this.nullLabel = '...';
        }

        //Set model to null value if not defined or null
        if (this.isNullable) {
          if (this.model === null || typeof this.model === 'undefined') {
            this.model = this.nullValue;
          }
        }

        //If disabled, hide options
        if (this.isDisabled) {
          this.isShowingOptions = false;
        }

        //Determine selection index
        var option = findOption(this.model, this.options);
        selectionIndex = this.options.indexOf(option);

        //Validate and mark as dirty if needed
        if (changes.model) {
          this.ngModel.$validate();
          if ($formControls.hasChanged(changes.model)) {
            this.ngModel.$setDirty();
          }
        }
      };

      /**
       * Keydown handler for input element
       */
      this.keydown = function (event) {

        //Arrows up/down, move selection
        if (this.isShowingOptions) {
          if (event.keyCode === KeyCodes.UP) {
            event.preventDefault();
            moveSelectionUp();
          } else if (event.keyCode === KeyCodes.DOWN) {
            event.preventDefault();
            moveSelectionDown();
          } else if (event.keyCode === KeyCodes.ESC) {
            event.preventDefault();
            this.hideOptions();
          }
        }

        //Enter or space either confirm selection or show options
        if (event.keyCode === KeyCodes.ENTER || event.keyCode === KeyCodes.SPACE) {
          event.preventDefault();
          if (this.isShowingOptions) {
            this.confirmSelection();
          } else {
            this.showOptions();
          }
        }
      };

      /**
       * Get label value of selected option
       */
      this.getSelectedLabel = function () {
        var option = findOption(this.model, this.options);
        return getLabelValue(option);
      };

      /**
       * Get label value of an option
       */
      this.getLabel = function (option) {
        return getLabelValue(option);
      };

      /**
       * Show options
       */
      this.showOptions = function () {
        if (!this.isDisabled && !this.hasSpinner) {
          this.isShowingOptions = true;
        }
      };

      /**
       * Hide options
       */
      this.hideOptions = function () {
        this.isShowingOptions = false;
      };

      /**
       * Toggle options
       */
      this.toggleOptions = function () {
        if (this.isShowingOptions) {
          this.hideOptions();
        } else {
          this.showOptions();
        }
      };

      /**
       * Has options check
       */
      this.hasOptions = function () {
        return this.options.length > 0;
      };

      /**
       * Select an option
       */
      this.select = function (option, index) {

        //Ignore when disabled
        if (this.isDisabled) {
          return;
        }

        //Hide options
        this.hideOptions();

        //Get the new model value and call on change handler
        var value = getModelValue(option, index);
        this.onChange({ value: value, option: option });
      };

      /**
       * Set the selection index
       */
      this.setSelection = function (index) {
        selectionIndex = index;
      };

      /**
       * Check if given index is the selection index
       */
      this.isSelection = function (index) {
        return selectionIndex === index;
      };

      /**
       * Confirm selection
       */
      this.confirmSelection = function (index) {

        //If index not given, use current selection index
        if (typeof index === 'undefined') {
          index = selectionIndex;
        }

        //Initialize option
        var option = void 0;

        //Nullable and -1 index given?
        if (this.isNullable && index === -1) {
          option = null;
        }

        //Otherwise, take from given options
        else {

            //Validate index
            if (!this.hasOptions() || typeof index === 'undefined' || typeof this.options[index] === 'undefined') {
              return;
            }

            //Get option
            option = this.options[index];
          }

        //Select option now
        this.select(option, index);
      };
    }]
  });
})(window, window.angular);