
/**
 * Module definition and dependencies
 */
angular.module('SelectBox.Component', [])

/**
 * Selectbox component
 */
.component('selectBox', {
  template:
    `<div class="SelectBox {{$ctrl.selectBoxClass}}">
      <div class="InputWrapper is-clickable" ng-click="$ctrl.toggleOptions()">
        <div class="Caret"
          ng-class="{disabled: $ctrl.isDisabled}"
          ng-click="$event.stopPropagation(); $ctrl.toggleOptions();"
          ng-if="!$ctrl.hasSpinner"
        ></div>
        <input readonly class="Input {{$ctrl.inputClass}}" type="text"
          ng-value="$ctrl.getSelectedLabel()"
          ng-keydown="$ctrl.keydown($event)"
          ng-class="{disabled: ($ctrl.isDisabled || $ctrl.hasSpinner)}">
        <spinner class="Spinner--input" ng-if="$ctrl.hasSpinner"></spinner>
      </div>
      <ul class="SelectBox-options" ng-show="$ctrl.isShowingOptions">
        <li
          ng-if="$ctrl.isNullable || !$ctrl.hasOptions()"
          ng-class="{selected: $ctrl.isSelection(-1)}"
          ng-mouseover="$ctrl.setSelection(-1)"
          ng-click="$ctrl.confirmSelection(-1); $event.preventDefault();"
        >{{$ctrl.nullLabel}}</li>
        <li
          ng-transclude
          ng-repeat="option in $ctrl.options"
          ng-class="{selected: $ctrl.isSelection($index)}"
          ng-mouseover="$ctrl.setSelection($index)"
          ng-click="$ctrl.confirmSelection($index); $event.preventDefault();"
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
    inputClass: '@',
    isDisabled: '<ngDisabled',
    hasSpinner: '<hasSpinner',
  },

  /**
   * Component controller
   */
  controller(
    $element, $attrs, $log, $formControls, $scope, $document, $timeout, $window
  ) {

    //Helper vars
    const $ctrl = this;
    let selectionIndex, $input, $container;
    let labelBy = $attrs.labelBy || null;
    let trackBy = $attrs.trackBy || null;
    let asObject = ($attrs.asObject === 'true');
    let phrase = '';

    //Keycodes
    const KeyCodes = {
      ENTER: 13,
      ESC: 27,
      SPACE: 32,
      UP: 38,
      DOWN: 40,
    };

    /**
     * Debounce helper
     */
    function debounce(func, delay) {

      //Timeout placeholder
      let timeout;

      //Create wrapper function
      const wrapper = function() {

        //Clear any existing timeout
        if (timeout) {
          clearTimeout(timeout);
        }

        //Create new timeout
        timeout = setTimeout(() => func(), delay);
      };

      //Return wrapper function
      return wrapper;
    }

    /**
     * Function to clear the phrase (debounced after 1.5 seconds)
     */
    const clearPhrase = debounce(() => {
      phrase = '';
    }, 1000);

    /**
     * Check if input was text
     */
    function isTextInput(event) {
      if (event.keyCode >= 48 && event.keyCode <= 57) {
        return true;
      }
      if (event.keyCode >= 65 && event.keyCode <= 90) {
        return true;
      }
      if (event.keyCode === 32) {
        return true;
      }
      return false;
    }

    /**
     * Click handler for document
     */
    function documentClickHandler(event) {
      if ($ctrl.isShowingOptions && !$element[0].contains(event.target)) {
        $scope.$apply($ctrl.hideOptions.bind($ctrl));
        event.preventDefault();
        event.stopPropagation();
      }
    }

    /**
     * Find scrollable parent
     */
    function findScrollableParent($child) {

      //Get parent
      const $parent = $child.parent();
      if ($parent.length === 0) {
        return null;
      }

      //Get style
      const style = $window.getComputedStyle($parent[0]);

      //Find element that has auto overflow or which is the body
      if ($parent[0].tagName === 'BODY' || style.overflowY === 'auto') {
        return $parent;
      }

      //Find next
      return findScrollableParent($parent);
    }

    /**
     * Find offset relative to a certain node
     */
    function findOffset(node, relativeNode) {
      let offset = node.offsetTop;
      while (node.offsetParent && node.offsetParent !== relativeNode) {
        node = node.offsetParent;
        offset += node.offsetTop;
      }
      return offset;
    }

    /**
     * Ensure the whole dropdown is in view
     */
    function ensureDropdownInView() {

      //Find scrollable parent
      const $parent = findScrollableParent($element);
      if (!$parent) {
        return;
      }

      //Get params
      const offset = findOffset($container[0], $parent[0]);
      const height = $parent[0].clientHeight;
      const scroll = $parent[0].scrollTop;
      const bottom = offset - scroll + $container[0].clientHeight;

      //Check if it's outside of the height
      if (bottom > height) {
        const diff = bottom - height + 16;
        $parent[0].scrollTop += diff;
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

      //Find options
      const $options = $container.children();

      //Get option now, taking into account the additional nullable element
      const option = $options[selectionIndex + ($ctrl.isNullable ? 1 : 0)];
      if (!option) {
        return;
      }

      //Determine container and element top and bottom
      const cTop = $container[0].scrollTop;
      const cBottom = cTop + $container[0].clientHeight;
      const eTop = option.offsetTop;
      const eBottom = eTop + option.clientHeight;

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
      let modelValue = getTrackingValue(model, model);

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
      this.selectBoxClass = $element[0].className;
      $element[0].className = '';

      //Find some elements
      $input = $element.find('input');
      $container = $input.parent().next();

      //Apply global click handler
      //NOTE: applied on body, so that it can prevent global $document handlers
      $document.find('body').on('click', documentClickHandler);

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {
        if ($ctrl.isNullable) {
          return ($ctrl.model === $ctrl.nullValue);
        }
        return (
          $ctrl.model === null ||
          $ctrl.model === $ctrl.nullValue ||
          typeof $ctrl.model === 'undefined'
        );
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
        if (typeof this.options === 'string') {
          this.options = this.options.split('\n');
        }
        else {
          this.options = [];
        }
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

      //Move selection up or down
      if (event.keyCode === KeyCodes.UP) {
        event.preventDefault();
        if (this.isShowingOptions) {
          moveSelectionUp();
        }
        else {
          this.showOptions();
        }
      }
      else if (event.keyCode === KeyCodes.DOWN) {
        event.preventDefault();
        if (this.isShowingOptions) {
          moveSelectionDown();
        }
        else {
          this.showOptions();
        }
      }

      //Confirm selection
      else if (event.keyCode === KeyCodes.ENTER && this.isShowingOptions) {
        event.preventDefault();
        this.confirmSelection();
      }

      //Hide options
      else if (event.keyCode === KeyCodes.ESC && this.isShowingOptions) {
        event.preventDefault();
        this.hideOptions();
      }

      //Show options
      else if (event.keyCode === KeyCodes.ENTER && !this.isShowingOptions) {
        event.preventDefault();
        this.showOptions();
      }

      //Text input
      else if (isTextInput(event)) {
        const char = String.fromCharCode(event.keyCode);
        this.selectByInput(char);
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
        $timeout(() => {
          ensureDropdownInView();
          ensureSelectionInView();
        });
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
     * Select by input character(s)
     */
    this.selectByInput = function(char) {

      //Lowercase all the things
      char = char.toLowerCase();

      //Add to phrase
      phrase += char;

      //Create regex
      const regex = new RegExp('^' + phrase, 'i');

      //Find matching option
      const option = this.options.find(option => {
        const label = getLabelValue(option);
        return label.match(regex);
      });

      //Match found?
      if (option) {
        const index = this.options.findIndex(o => o === option);
        this.select(option, index, true);
      }

      //Clear phrase (debounced)
      clearPhrase();
    };

    /**
     * Select an option
     */
    this.select = function(option, index, leaveOpen) {

      //Ignore when disabled
      if (this.isDisabled) {
        return;
      }

      //Hide options
      if (!leaveOpen) {
        this.hideOptions();
      }
      else {
        ensureSelectionInView();
      }

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
