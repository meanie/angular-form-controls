
/**
 * Module definition and dependencies
 */
angular.module('SelectBox.Component', [])

/**
 * Selectbox component
 */
.component('selectBox', {
  template:
    `<div class="select-box {{$ctrl.classes}}">
      <div class="form-control-wrapper clickable" ng-click="$ctrl.toggleOptions()">
        <span class="form-control-spinner" ng-class="{'show-spinner': $ctrl.hasSpinner}">
          <span class="caret"
            ng-click="$ctrl.toggleOptions(); $event.stopPropagation();"
            ng-class="{disabled: $ctrl.isDisabled}"
            ng-if="!$ctrl.hasSpinner"
          ></span>
          <input readonly class="form-control" type="text"
            ng-value="$ctrl.getSelectedLabel()"
            ng-keydown="$ctrl.keydown($event)"
            ng-class="{disabled: ($ctrl.isDisabled || $ctrl.hasSpinner)}">
          <spinner ng-if="$ctrl.hasSpinner"></spinner>
        </span>
      </div>
      <ul class="select-box-options" ng-show="$ctrl.isShowingOptions">
        <li
          ng-if="$ctrl.isNullable || !$ctrl.hasOptions()"
          ng-class="{selected: $ctrl.isSelection(-1)}"
          ng-mouseover="$ctrl.setSelection(-1)"
          ng-click="$ctrl.confirmSelection(-1)"
        >{{$ctrl.nullLabel}}</li>
        <li
          ng-transclude
          ng-repeat="option in $ctrl.options"
          ng-class="{selected: $ctrl.isSelection($index)}"
          ng-mouseover="$ctrl.setSelection($index)"
          ng-click="$ctrl.confirmSelection($index)"
        >{{$ctrl.getLabel(option)}}</li>
      </ul>
    </div>`,
  transclude: true,
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
    hasSpinner: '<hasSpinner',
  },

  /**
   * Component controller
   */
  controller($element, $attrs, $log, $formControls, $scope, $document) {

    //Helper vars
    let $ctrl = this;
    let selectionIndex, $input, $container, $options;
    let labelBy = $attrs.labelBy || null;
    let trackBy = $attrs.trackBy || null;
    let asObject = ($attrs.asObject === 'true');

    //Keycodes
    const KeyCodes = {
      ENTER: 13,
      ESC: 27,
      SPACE: 32,
      UP: 38,
      DOWN: 40,
    };

    /**
     * Check if input was control
     */
    function isControlInput(event) {
      let keys = [KeyCodes.UP, KeyCodes.DOWN, KeyCodes.ENTER, KeyCodes.ESC];
      return (keys.indexOf(event.keyCode) > -1);
    }

    /**
     * Click handler for document
     */
    function documentClickHandler(event) {
      if (!$input[0].contains(event.target) && $ctrl.isShowingOptions) {
        $scope.$apply($ctrl.hideOptions.bind($ctrl));
        event.preventDefault();
        event.stopPropagation();
      }
    }

    /**
     * Ensure the selected option is in view
     */
    function ensureSelectionInView() {

      //Check index
      if (!$ctrl.isNullable && selectionIndex < 0) {
        return;
      }

      //Get option now, taking into account the additional nullable element
      let option = $options[selectionIndex + ($ctrl.isNullable ? 1 : 0)];
      if (!option) {
        return;
      }

      //Determine container and element top and bottom
      let cTop = $container[0].scrollTop;
      let cBottom = cTop + $container[0].clientHeight;
      let eTop = option.offsetTop;
      let eBottom = eTop + option.clientHeight;

      //Check if out of view
      if (eTop < cTop) {
        $container[0].scrollTop -= (cTop - eTop);
      }
      else if (eBottom > cBottom) {
        $container[0].scrollTop += (eBottom - cBottom);
      }
    }

    /**
     * Move selection up
     */
    function moveSelectionUp() {
      let oldIndex = selectionIndex;
      if (typeof selectionIndex === 'undefined') {
        if ($ctrl.isNullable) {
          selectionIndex = -1;
        }
        else if ($ctrl.options.length > 0) {
          selectionIndex = $ctrl.options.length - 1;
        }
      }
      else if (selectionIndex > ($ctrl.isNullable ? -1 : 0)) {
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
      let oldIndex = selectionIndex;
      if (typeof selectionIndex === 'undefined') {
        if ($ctrl.isNullable) {
          selectionIndex = -1;
        }
        else if ($ctrl.options.length > 0) {
          selectionIndex = 0;
        }
      }
      else if (selectionIndex < ($ctrl.options.length - 1)) {
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
      let modelValue = model;
      if (asObject && angular.isObject(model)) {
        modelValue = getTrackingValue(model);
      }

      //Find matching option
      return options
        .find((option, index) => {
          let optionValue = getTrackingValue(option, index);
          return (modelValue === optionValue);
        });
    }

    /**
     * Initialization
     */
    this.$onInit = function() {

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
      //NOTE: applied on body, so that it can prevent global $document handlers
      $document.find('body').on('click', documentClickHandler);

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {
        if ($ctrl.isNullable) {
          return ($ctrl.model === $ctrl.nullValue);
        }
        return ($ctrl.model === null || typeof $ctrl.model === 'undefined');
      };
    };

    /**
     * Destroy
     */
    this.$onDestroy = function() {
      $document.find('body').off('click', documentClickHandler);
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
      let option = findOption(this.model, this.options);
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
    this.keydown = function(event) {

      //Arrows up/down, move selection
      if (this.isShowingOptions && isControlInput(event)) {
        event.preventDefault();
        if (event.keyCode === KeyCodes.UP) {
          moveSelectionUp();
        }
        else if (event.keyCode === KeyCodes.DOWN) {
          moveSelectionDown();
        }
        else if (event.keyCode === KeyCodes.ESC) {
          this.hideOptions();
        }
        else if (event.keyCode === KeyCodes.ENTER) {
          this.confirmSelection();
        }
      }

      //Show options
      else if (event.keyCode === KeyCodes.ENTER) {
        event.preventDefault();
        this.showOptions();
      }
    };

    /**
     * Get label value of selected option
     */
    this.getSelectedLabel = function() {
      let option = findOption(this.model, this.options);
      return getLabelValue(option);
    };

    /**
     * Get label value of an option
     */
    this.getLabel = function(option) {
      return getLabelValue(option);
    };

    /**
     * Show options
     */
    this.showOptions = function() {
      if (!this.isDisabled && !this.hasSpinner) {
        this.isShowingOptions = true;
      }
    };

    /**
     * Hide options
     */
    this.hideOptions = function() {
      this.isShowingOptions = false;
    };

    /**
     * Toggle options
     */
    this.toggleOptions = function() {
      if (this.isShowingOptions) {
        this.hideOptions();
      }
      else {
        this.showOptions();
      }
    };

    /**
     * Has options check
     */
    this.hasOptions = function() {
      return (this.options.length > 0);
    };

    /**
     * Select an option
     */
    this.select = function(option, index) {

      //Ignore when disabled
      if (this.isDisabled) {
        return;
      }

      //Hide options
      this.hideOptions();

      //Get the new model value and call on change handler
      let value = getModelValue(option, index);
      this.onChange({value, option});
    };

    /**
     * Set the selection index
     */
    this.setSelection = function(index) {
      selectionIndex = index;
    };

    /**
     * Check if given index is the selection index
     */
    this.isSelection = function(index) {
      return (selectionIndex === index);
    };

    /**
     * Confirm selection
     */
    this.confirmSelection = function(index) {

      //If index not given, use current selection index
      if (typeof index === 'undefined') {
        index = selectionIndex;
      }

      //Initialize option
      let option;

      //Nullable and -1 index given?
      if (this.isNullable && index === -1) {
        option = null;
      }

      //Otherwise, take from given options
      else {

        //Validate index
        if (
          !this.hasOptions() ||
          typeof index === 'undefined' ||
          typeof this.options[index] === 'undefined'
        ) {
          return;
        }

        //Get option
        option = this.options[index];
      }

      //Select option now
      this.select(option, index);
    };
  },
});
