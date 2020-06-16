/**
 * Module definition and dependencies
 */
angular.module('TypeAhead.Component', [])

/**
 * Type ahead component
 */
.component('typeAhead', {
  template:
    `<div class="TypeAhead {{$ctrl.typeAheadClass}}">
      <input class="Input {{$ctrl.inputClass}}" type="text"
        placeholder="{{$ctrl.placeholder}}"
        ng-keydown="$ctrl.keydown($event)"
        ng-keyup="$ctrl.keyup($event)"
        ng-disabled="$ctrl.isDisabled"
        ng-model="$ctrl.searchQuery">
      <spinner class="Spinner--input" ng-if="$ctrl.isSearching"></spinner>
      <ul class="TypeAhead-results" ng-if="$ctrl.isShowingResults">
        <li
          ng-repeat="item in $ctrl.results"
          ng-class="{selected: $ctrl.isSelection($index)}"
          ng-mouseover="$ctrl.setSelection($index)"
          ng-click="$ctrl.confirmSelection($index)"
          ng-transclude>
          <span ng-bind-html="$ctrl.getLabel(item) |
            markmatches:$ctrl.searchQuery:'strong'"></span>
        </li>
      </ul>
    </div>`,
  transclude: true,
  require: {
    ngModel: 'ngModel',
  },
  bindings: {
    model: '<ngModel',
    inputClass: '@',
    options: '<',
    placeholder: '@',
    debounce: '<',
    clearInput: '<',
    onSearch: '&',
    onChange: '&',
    onQuery: '&',
    isDisabled: '<ngDisabled',
    labelBy: '@',
    trackBy: '@',
    asObject: '@',
    minLength: '@',
    allowNew: '@',
  },

  /**
   * Component controller
   */
  controller(
    $element, $scope, $formControls, $attrs, $log, $q, $timeout, $document
  ) {

    //Helper vars
    let $input;
    let selectionIndex = -1;
    const $ctrl = this;
    const labelBy = $attrs.labelBy || null;
    const trackBy = $attrs.trackBy || null;
    const asObject = ($attrs.asObject === 'true');
    const allowNew = ($attrs.allowNew === 'true');

    //Keep track of searches, prevent older searches overwriting newer ones
    let currentSearch = 0;
    let lastProcessedSearch = 0;
    let pendingSearch = null;

    //Keycodes
    const ENTER = 13;
    const ESC = 27;
    const TAB = 9;
    const LEFT = 37;
    const UP = 38;
    const RIGHT = 39;
    const DOWN = 40;
    const SHIFT = 16;
    const CTRL = 17;
    const ALT = 18;
    const CAPSLOCK = 20;
    const CMDLEFT = 91;
    const CMDRIGHT = 93;

    /**
     * Check if input was control
     */
    function isControlInput(event) {
      const keys = [
        UP, DOWN, LEFT, RIGHT, ENTER, ESC, TAB, SHIFT,
        CTRL, ALT, CAPSLOCK, CMDLEFT, CMDRIGHT,
      ];
      return (keys.indexOf(event.keyCode) > -1);
    }

    /**
     * Click handler for document
     */
    function documentClickHandler(event) {
      if (!$input[0].contains(event.target) && $ctrl.isShowingResults) {
        $scope.$apply($ctrl.hideResults.bind($ctrl));
        event.preventDefault();
        event.stopPropagation();
      }
    }

    /**
     * Ensure the selected option is in view
     */
    function ensureSelectionInView() {

      //Only if open
      if (!$ctrl.isShowingResults) {
        return;
      }

      //Check index
      if (!$ctrl.isNullable && selectionIndex < 0) {
        return;
      }

      //Find options
      const $container = $input.next().next();
      const $options = $container.find('li');

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
      const oldIndex = selectionIndex;
      if (typeof selectionIndex === 'undefined') {
        if ($ctrl.isNullable) {
          selectionIndex = -1;
        }
        else if ($ctrl.results.length > 0) {
          selectionIndex = $ctrl.results.length - 1;
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
      const oldIndex = selectionIndex;
      if (typeof selectionIndex === 'undefined') {
        if ($ctrl.isNullable) {
          selectionIndex = -1;
        }
        else if ($ctrl.results.length > 0) {
          selectionIndex = 0;
        }
      }
      else if (selectionIndex < ($ctrl.results.length - 1)) {
        selectionIndex++;
      }
      if (oldIndex !== selectionIndex) {
        ensureSelectionInView();
      }
    }

    /**
     * Helper to get the tracking value of an option
     */
    function getTrackingValue(option) {

      //Non object? Track by its value
      if (option === null || !angular.isObject(option)) {
        return option;
      }

      //Must have tracking property
      if (!trackBy) {
        $log.warn('Missing track-by property for type ahead');
        return null;
      }

      //Validate property
      if (typeof option[trackBy] === 'undefined') {
        $log.warn('Unknown property `' + trackBy + '` for type ahead tracking');
        return null;
      }

      //Return the property
      return option[trackBy];
    }

    /**
     * Get the model value
     */
    function getModelValue(option) {

      //If returning as object, return the selected option
      if (asObject) {
        return option;
      }

      //Otherwise, return the tracking value of the given option
      return getTrackingValue(option);
    }

    /**
     * Get label value of an option
     */
    function getLabelValue(option) {

      //Null value?
      if (option === null || typeof option === 'undefined') {
        return '';
      }

      //Non object? Use its value
      if (!angular.isObject(option)) {
        return option;
      }

      //Must have label property
      if (!labelBy) {
        $log.warn('Missing label-by property for type ahead');
        return '';
      }

      //Validate property
      if (typeof option[labelBy] === 'undefined') {
        $log.warn('Unknown property `' + labelBy + '` for type ahead label');
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
      const modelValue = getTrackingValue(model, model);

      //Find matching option
      return options
        .find((option, index) => {
          const optionValue = getTrackingValue(option, index);
          return (modelValue === optionValue);
        });
    }

    /**
     * Do a simple search on object property
     */
    function searchOptions(value) {
      if (!value) {
        return $q.resolve([]);
      }
      const regex = new RegExp('(?:^|\\b)(' + value + ')', 'i');
      const items = $ctrl.options
        .filter(option => {
          const label = getLabelValue(option);
          return regex.test(label);
        });
      return $q.resolve(items);
    }

    /**
     * Init
     */
    this.$onInit = function() {

      //Find some elements
      $input = $element.find('input');

      //Propagate focus
      $element.attr('tabindex', -1);
      $element.on('focus', () => {
        $input[0].focus();
      });

      //Propagate classes
      this.typeAheadClass = $element[0].className;
      $element[0].className = '';

      //Apply document click handler
      //NOTE: applied on body, so that it can prevent global $document handlers
      $document.find('body').on('click', documentClickHandler);

      //Initialize results and flags
      this.results = [];
      this.isSearching = false;
      this.isShowingResults = false;

      //Empty check override in order for ng-required to work properly
      this.ngModel.$isEmpty = function() {
        if ($ctrl.model === null || typeof $ctrl.model === 'undefined') {
          if (allowNew && $ctrl.searchQuery) {
            return false;
          }
          return true;
        }
        return false;
      };
    };

    /**
     * Destroy
     */
    this.$onDestroy = function() {
      $document.find('body').off('click', documentClickHandler);
    };

    /**
     * Change handler
     */
    this.$onChanges = function(changes) {

      //Clear search query if we get a clear input change
      //NOTE: This is a small hack to fix the issue we were having with
      //the whole search query being cleared when the address model was
      //invalidated. We want to persist the search query if someone types
      //their address and tries to change it, yet we do need a method of
      //properly clearing the address input as well, hence this hack.
      if (changes.clearInput) {
        this.searchQuery = '';
      }

      //Validate and mark as dirty if needed
      if (changes.model) {

        //Only update search query when we have a model
        //This is to prevent the input from being cleared when we go and edit
        if (this.model) {
          let option;
          if (angular.isArray(this.options)) {
            option = findOption(this.model, this.options);
          }
          else if (angular.isObject(this.model)) {
            option = this.model;
          }
          if (option) {
            this.searchQuery = getLabelValue(option);
          }
        }

        //Validate model
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
     * Key down handler
     */
    this.keydown = function(event) {

      //Arrows up/down, move selection
      if (this.isShowingResults) {
        if (event.keyCode === UP) {
          event.preventDefault();
          moveSelectionUp();
        }
        else if (event.keyCode === DOWN) {
          event.preventDefault();
          moveSelectionDown();
        }
        else if (event.keyCode === ESC) {
          event.preventDefault();
          this.hideResults();
        }
        else if (event.keyCode === TAB) {
          //Don't prevent default
          this.hideResults();
        }
        else if (event.keyCode === ENTER) {
          event.preventDefault();
          this.confirmSelection();
        }
      }

      //Show options
      else if (event.keyCode === ENTER) {
        event.preventDefault();
        this.showResults();
      }
    };

    /**
     * Key up handler
     */
    this.keyup = function(event) {

      //If control input, skip further handling
      if (isControlInput(event)) {
        return;
      }

      //Get search query
      const value = (this.searchQuery || '').trim();

      //Unchanged search query?
      if (value === this.lastValue) {
        return;
      }

      //Set new value
      this.lastValue = value;

      //Call event handlers
      this.onQuery({value});
      this.onChange({value: null, option: null});

      //Validate and mark as dirty
      this.ngModel.$validate();
      this.ngModel.$setDirty();

      //Cancel any old pending search
      if (pendingSearch) {
        $timeout.cancel(pendingSearch);
      }

      //Should we search?
      if (!this.minLength || value.length >= this.minLength) {
        this.search(value);
      }
      else if (this.hasResults()) {
        this.clearResults();
        this.clearSelection();
      }
    };

    /**************************************************************************
     * Search
     ***/

    /**
     * Search wrapper
     */
    this.search = function(value) {

      //Create new debounced search
      pendingSearch = $timeout(() => {
        pendingSearch = null;
        return this.doSearch(value);
      }, this.debounce || 250);

      //Return the promise
      return pendingSearch;
    };

    /**
     * Actual search handler
     */
    this.doSearch = function(value) {

      //Determine search handler
      let search;
      if (this.options && angular.isArray(this.options)) {
        search = searchOptions(value);
      }
      else if ($attrs.onSearch) {
        search = this.onSearch({value});
      }
      else {
        $log.warn('No search handler or options specified');
        return $q.reject();
      }

      //Toggle flag
      this.isSearching = true;

      //Return search promise
      return search

        //Check if we've gotten an old search back
        .then(results => {
          if (++currentSearch > lastProcessedSearch) {
            return results;
          }
          return $q.reject('old search');
        })

        //Process the results
        .then(results => {
          this.clearSelection();
          this.results = results;
          if (results && results.length > 0) {
            this.isShowingResults = true;
          }
          lastProcessedSearch = currentSearch;
        })

        //Done searching
        .finally(() => this.isSearching = false);
    };

    /**************************************************************************
     * Results navigation & handling
     ***/

    /**
     * Check if we have results
     */
    this.hasResults = function() {
      return (this.results && this.results.length > 0);
    };

    /**
     * Clear results
     */
    this.clearResults = function() {
      this.results = [];
      this.isShowingResults = false;
    };

    /**
     * Show results
     */
    this.showResults = function() {
      if (this.hasResults()) {
        this.isShowingResults = true;
      }
    };

    /**
     * Select an option
     */
    this.select = function(option) {

      //Ignore when disabled
      if (this.isDisabled) {
        return;
      }

      //Hide options
      this.hideResults();

      //Get the new model and label values
      const value = getModelValue(option);
      const label = getLabelValue(option);

      //Set as search query
      this.searchQuery = label;

      //Call event handlers
      this.onQuery({value: label});
      this.onChange({value, option});
    };

    /**
     * Hide results
     */
    this.hideResults = function() {
      this.isShowingResults = false;
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
     * Clear selection
     */
    this.clearSelection = function() {
      selectionIndex = undefined;
    };

    /**
     * Confirm selection
     */
    this.confirmSelection = function(index) {

      //If index not given, use current selection index
      if (typeof index === 'undefined') {
        index = selectionIndex;
      }

      //Validate index
      if (
        this.results.length === 0 ||
        typeof this.results[index] === 'undefined') {
        return;
      }

      //Select result
      this.select(this.results[index]);
    };
  },
});
