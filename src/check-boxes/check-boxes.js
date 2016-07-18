
/**
 * Module definition and dependencies
 */
angular.module('CheckBoxes.Component', [])

/**
 * Checkboxes component
 */
.component('checkBoxes', {
  template:
    `<div class="check-box-group {{$ctrl.classes}}">
      <label class="check-box"
        ng-repeat="option in $ctrl.options"
        ng-click="$ctrl.toggle(option, $index)"
        ng-class="{checked: $ctrl.isChecked(option, $index), disabled: $ctrl.isDisabled}"
      >{{$ctrl.getLabel(option)}}</label>
    </div>`,
  require: {
    ngModel: 'ngModel',
  },
  bindings: {
    model: '<ngModel',
    options: '<',
    onChange: '&',
    isDisabled: '<ngDisabled',
    isRequired: '<ngRequired',
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

      //Get the model and option values
      let optionValue = getTrackingValue(option, index);
      let modelValues = model.map(modelValue => {
        if (asObject && angular.isObject(modelValue)) {
          return getTrackingValue(modelValue);
        }
        return modelValue;
      });

      //See if present in model values
      let find = modelValues.find(modelValue => modelValue === optionValue);
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

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {

        //Needed here to prevent $validate from setting the model to undefined
        $ctrl.ngModel.$$setOptions({
          allowInvalid: true,
        });

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
     * Toggle an option
     */
    this.toggle = function(option, index) {

      //Ignore when disabled
      if (this.isDisabled) {
        return;
      }

      //Initialize value of our model array
      let value = [];
      if (angular.isArray(this.model)) {
        value = this.model.map(item => item);
      }

      //Check if currently checked (use source model) and get the item value
      let checked = isChecked(value, option, index);
      let item = asObject ? option : getTrackingValue(option, index);

      //If checked, remove from target model, otherwise add
      if (checked) {
        let i = value.indexOf(item);
        value.splice(i, 1);
      }
      else {
        value.push(item);
      }

      //Call on change handler
      this.onChange({value});
    };
  },
});
