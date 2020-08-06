
/**
 * Module definition and dependencies
 */
angular.module('CheckBoxes.Component', [])

/**
 * Checkboxes component
 */
.component('checkBoxes', {
  template:
    `<div class="CheckBoxGroup {{$ctrl.classes}}">
      <label class="CheckBox"
        ng-repeat="option in $ctrl.options"
        ng-click="$ctrl.toggle(option, $index)"
        ng-class="{checked: $ctrl.isChecked(option, $index), disabled: ($ctrl.isDisabled || $ctrl.isOptionDisabled(option, $index))}"
      >{{$ctrl.getLabel(option)}}</label>
    </div>`,
  require: {
    ngModel: 'ngModel',
  },
  bindings: {
    model: '<ngModel',
    options: '<',
    min: '<',
    max: '<',
    onChange: '&',
    single: '<',
    isDisabled: '<ngDisabled',
    disabledValues: '<',
  },

  /**
   * Component controller
   */
  controller($element, $attrs, $log, $formControls) {

    //Helper vars
    let $ctrl = this;
    let labelBy = $attrs.labelBy || null;
    let trackBy = $attrs.trackBy || null;
    let asObject = ($attrs.asObject === 'true');

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

      //Get option value
      let optionValue = getTrackingValue(option, index);

      //See if present in model values
      let find = model.find(model => {
        let modelValue = getTrackingValue(model, model);
        return (modelValue === optionValue);
      });
      return (typeof find !== 'undefined');
    }

    /**
     * Initialization
     */
    this.$onInit = function() {

      //Check configuration
      if (asObject && trackBy === '$index') {
        $log.warn('Cannot track check boxes by index if model is an object');
        asObject = false;
      }

      //Propagate classes
      this.classes = $element[0].className;
      $element[0].className = '';

      //Validation for min/max values
      this.ngModel.$validators.min = function(modelValue) {
        if ($ctrl.ngModel.$error.required) {
          return true;
        }
        if (!$ctrl.min || $ctrl.min < 0) {
          return true;
        }
        return (!angular.isArray(modelValue) || modelValue.length >= $ctrl.min);
      };
      this.ngModel.$validators.max = function(modelValue) {
        if ($ctrl.ngModel.$error.required) {
          return true;
        }
        if (!$ctrl.max || $ctrl.max < 0) {
          return true;
        }
        return (!angular.isArray(modelValue) || modelValue.length <= $ctrl.max);
      };

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {

        //Needed here to prevent $validate from setting the model to undefined
        //NOTE: first approach for Angular < 1.6.0
        if (typeof $ctrl.ngModel.$$setOptions === 'function') {
          $ctrl.ngModel.$$setOptions({
            allowInvalid: true,
          });
        }
        else {
          $ctrl.ngModel.$options = $ctrl.ngModel.$options.createChild({
            allowInvalid: true,
          });
        }

        //Return check now
        return (!angular.isArray($ctrl.model) || $ctrl.model.length === 0);
      };
    };

    /**
     * On change
     */
    this.$onChanges = function(changes) {

      //Must have array as options
      if (!angular.isArray(this.options)) {
        if (typeof this.options === 'string') {
          const options = this.options.split('\n');
          const set = new Set(options);
          this.options = Array.from(set.values());
        }
        else {
          this.options = [];
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
    this.getLabel = function(option) {
      return getLabelValue(option);
    };

    /**
     * Check if given option is checked
     */
    this.isChecked = function(option, index) {
      return isChecked(this.model, option, index);
    };

    /**
     * Check if an option is disabled
     */
    this.isOptionDisabled = function(option, index) {
      if (!this.disabledValues || !Array.isArray(this.disabledValues)) {
        return false;
      }
      const value = getTrackingValue(option, index);
      return this.disabledValues.includes(value);
    };

    /**
     * Toggle an option
     */
    this.toggle = function(option, index) {

      //Ignore when disabled
      if (this.isDisabled || this.isOptionDisabled(option, index)) {
        return;
      }

      //Initialize value of our model array
      let value = [];
      if (angular.isArray(this.model)) {
        value = this.model.map(item => item);
      }

      //Check if currently checked (use source model) and get the item value
      let checked = isChecked(value, option, index);
      let optionValue = getTrackingValue(option, index);

      //If checked, remove from target model, otherwise add
      if (checked) {
        let i = value.findIndex(model => {
          let modelValue = getTrackingValue(model, model);
          return (modelValue === optionValue);
        });
        value.splice(i, 1);
      }
      else if (this.single) {
        value = [asObject ? option : optionValue];
      }
      else {
        value.push(asObject ? option : optionValue);
      }

      //Call on change handler
      this.onChange({value});
    };
  },
});
