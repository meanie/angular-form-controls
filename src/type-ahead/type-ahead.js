/**
 * Module definition and dependencies
 */
angular.module('TypeAhead.Component', [])

/**
 * Type ahead component
 */
.component('typeAhead', {
  template:
    `<div class="TypeAhead">
      <span class="Input-Spinner"
        ng-class="{'Input-Spinner--Visible': $ctrl.isSearching}">
        <input class="Input" type="text"
          placeholder="{{$ctrl.placeholder}}"
          ng-keydown="$ctrl.keydown($event)"
          ng-keyup="$ctrl.keyup($event)"
          ng-disabled="$ctrl.isDisabled"
          ng-model="$ctrl.searchQuery">
        <spinner></spinner>
      </span>
      <ul class="TypeAhead-Results" ng-show="$ctrl.isShowingResults">
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
    options: '<',
    placeholder: '@',
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
    let $input, $container, $options;
    let $ctrl = this;
    let selectionIndex = -1;
    let debounce = 100;
    let labelBy = $attrs.labelBy || null;
    let trackBy = $attrs.trackBy || null;
    let asObject = ($attrs.asObject === 'true');
    let allowNew = ($attrs.allowNew === 'true');

    //Keep track of searches, prevent older searches overwriting newer ones
    let currentSearch = 0;
    let lastProcessedSearch = 0;
    let pendingSearch = null;

    //Keycodes
    const KeyCodes = {
      ENTER: 13,
      ESC: 27,
      SPACE: 32,
      TAB: 9,
      UP: 38,
      DOWN: 40,
    };

    /**
     * Check if input was control
     */
    function isControlInput(event) {
      let keys = [
        KeyCodes.UP, KeyCodes.DOWN, KeyCodes.ENTER, KeyCodes.ESC, KeyCodes.TAB,
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
      let modelValue = getTrackingValue(model, model);

      //Find matching option
      return options
        .find((option, index) => {
          let optionValue = getTrackingValue(option, index);
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
      let regex = new RegExp('(?:^|\\b)(' + value + ')', 'i');
      let items = $ctrl.options
        .filter(option => {
          let label = getLabelValue(option);
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
      $container = $input.parent().next();
      $options = $container.find('li');

      //Propagate focus
      $element.attr('tabindex', -1);
      $element.on('focus', () => {
        $input[0].focus();
      });

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
      if (this.isShowingResults && isControlInput(event)) {
        if (event.keyCode === KeyCodes.UP) {
          event.preventDefault();
          moveSelectionUp();
        }
        else if (event.keyCode === KeyCodes.DOWN) {
          event.preventDefault();
          moveSelectionDown();
        }
        else if (event.keyCode === KeyCodes.ESC) {
          event.preventDefault();
          this.hideResults();
        }
        else if (event.keyCode === KeyCodes.TAB) {
          //Don't prevent default
          this.hideResults();
        }
        else if (event.keyCode === KeyCodes.ENTER) {
          event.preventDefault();
          this.confirmSelection();
        }
      }

      //Show options
      else if (event.keyCode === KeyCodes.ENTER) {
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
      let value = (this.searchQuery || '').trim();

      //Call event handlers
      this.onQuery({value});
      this.onChange({value: null, option: null});

      //Validate and mark as dirty
      this.ngModel.$validate();
      this.ngModel.$setDirty();

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
      }, debounce);

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
      let value = getModelValue(option);
      let label = getLabelValue(option);

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
