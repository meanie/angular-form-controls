
/**
 * Module definition and dependencies
 */
angular.module('RadioButtons.Component', [])

/**
 * Radio buttons component
 */
.component('radioButtons', {
  template:
    `<div class="radio-button-group {{$ctrl.classes}}">
      <label class="radio-button"
        ng-if="$ctrl.isNullable"
        ng-click="$ctrl.select(null)"
        ng-class="{checked: $ctrl.isSelected(null), disabled: $ctrl.isDisabled}"
      >{{$ctrl.nullLabel}}</label>
      <label class="radio-button"
        ng-repeat="option in $ctrl.options"
        ng-click="$ctrl.select(option, $index)"
        ng-class="{checked: $ctrl.isSelected(option, $index), disabled: $ctrl.isDisabled}"
      >{{$ctrl.getLabel(option)}}</label>
    </div>`,
  require: {
    ngModel: 'ngModel',
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
      if (
        $ctrl.isNullable &&
        $ctrl.model === $ctrl.nullValue &&
        option === null) {
        return true;
      }

      //Nothing selected?
      if ($ctrl.model === null) {
        return false;
      }

      //Get the model and option values
      let modelValue = $ctrl.model;
      let optionValue = getTrackingValue(option, index);

      //If the model is an object, get its tracking value
      if (asObject && angular.isObject($ctrl.model)) {
        modelValue = getTrackingValue($ctrl.model);
      }

      //Compare the two
      return (modelValue === optionValue);
    }

    /**
     * Initialization
     */
    this.$onInit = function() {

      //Check configuration
      if (asObject && trackBy === '$index') {
        $log.warn('Cannot track radio buttons by index if model is an object');
        asObject = false;
      }

      //Propagate classes
      this.classes = $element[0].className;
      $element[0].className = '';

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {
        if ($ctrl.isNullable) {
          return ($ctrl.model === $ctrl.nullValue);
        }
        return ($ctrl.model === null || typeof $ctrl.model === 'undefined');
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
    this.getLabel = function(option) {
      return getLabelValue(option);
    };

    /**
     * Check if given option is selected
     */
    this.isSelected = function(option, index) {
      return isSelected(option, index);
    };

    /**
     * Select an option
     */
    this.select = function(option, index) {

      //Ignore when disabled
      if (this.isDisabled) {
        return;
      }

      //Get the new model value and call on change handler
      let value = getModelValue(option, index);
      this.onChange({value, option});
    };
  },
});
