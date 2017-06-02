
/**
 * Module definition and dependencies
 */
angular.module('CheckBox.Component', [])

/**
 * Checkbox component
 */
.component('checkBox', {
  template:
    `<label class="CheckBox"
      ng-transclude
      ng-click="$ctrl.toggle()"
      ng-class="{checked: $ctrl.isChecked(), disabled: $ctrl.isDisabled}"
    ></label>`,
  require: {
    ngModel: 'ngModel',
  },
  transclude: true,
  bindings: {
    model: '<ngModel',
    onChange: '&',
    isInverse: '<isInverse',
    isDisabled: '<ngDisabled',
  },

  /**
   * Component controller
   */
  controller($element, $formControls) {

    //Get instance
    let $ctrl = this;

    /**
     * On init
     */
    this.$onInit = function() {

      //Add checkbox wrapper class to parent component
      $element.addClass('check-box-wrapper');

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {
        if ($ctrl.isInverse) {
          return !!$ctrl.model;
        }
        return !$ctrl.model;
      };
    };

    /**
     * On change
     */
    this.$onChanges = function(changes) {

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
    this.toggle = function() {

      //Don't toggle when disabled
      if (this.isDisabled) {
        return;
      }

      //Get boolean value and call on change handler
      let value = !this.model;
      this.onChange({value});
    };

    /**
     * Check if checked
     */
    this.isChecked = function() {
      return (this.isInverse ? !this.model : !!this.model);
    };
  },
});
