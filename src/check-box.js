
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
      ng-click="$ctrl.toggle($event)"
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
      $element.addClass('CheckBox-Wrapper');

      //Find label
      const $label = $element.find('label');

      //Propagate focus
      $element.on('focus', () => {
        $label[0].focus();
      });

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
    this.toggle = function(event) {

      //Don't toggle when disabled or event default prevented
      if (this.isDisabled || event.defaultPrevented) {
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
