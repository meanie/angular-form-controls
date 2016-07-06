
/**
 * Module definition and dependencies
 */
angular.module('FormControls.Component', [
  'CheckBox.Component',
  'CheckBoxes.Component',
  'RadioButtons.Component',
  'SelectBox.Component',
  'TypeAhead.Component'
])

/**
 * Helper service
 */
.factory('$formControls', function() {
  return {

    /**
     * Check if an item value really changed (deep checking with angular.equals)
     */
    hasChanged(changes) {

      //Get previous and current value
      let {previousValue, currentValue} = changes;

      //If unitialized, don't trigger changes
      if (previousValue === 'UNINITIALIZED_VALUE') {
        return false;
      }

      //Check if equals
      return !angular.equals(previousValue, currentValue);
    }
  };
});
