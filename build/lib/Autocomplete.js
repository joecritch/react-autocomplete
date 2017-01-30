'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');
var ReactDOM = require('react-dom');
var scrollIntoView = require('dom-scroll-into-view');

var _debugStates = [];

var Autocomplete = React.createClass({
  displayName: 'Autocomplete',

  propTypes: {
    autocompleteInputValue: React.PropTypes.bool,
    initialValue: React.PropTypes.any,
    onChange: React.PropTypes.func,
    onSelect: React.PropTypes.func,
    shouldItemRender: React.PropTypes.func,
    renderItem: React.PropTypes.func.isRequired,
    menuStyle: React.PropTypes.object,
    inputProps: React.PropTypes.object
  },

  getDefaultProps: function getDefaultProps() {
    return {
      autocompleteInputValue: true,
      inputProps: {},
      onChange: function onChange() {},
      onSelect: function onSelect(value, item) {},
      renderMenu: function renderMenu(items, value, style) {
        return React.createElement('div', { style: _extends({}, style, this.menuStyle), children: items });
      },
      shouldItemRender: function shouldItemRender() {
        return true;
      },
      menuStyle: {
        borderRadius: '3px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '2px 0',
        fontSize: '90%',
        position: 'fixed',
        overflow: 'auto',
        maxHeight: '50%' }
    };
  },

  // TODO: don't cheat, let it flow to the bottom
  getInitialState: function getInitialState() {
    return {
      value: this.props.initialValue || '',
      isOpen: false,
      highlightedIndex: null
    };
  },

  componentWillMount: function componentWillMount() {
    this._ignoreBlur = false;
    this._performAutoCompleteOnUpdate = false;
    this._performAutoCompleteOnKeyUp = false;
  },

  componentWillReceiveProps: function componentWillReceiveProps() {
    this._performAutoCompleteOnUpdate = true;
  },

  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
    if (this.state.isOpen === true && prevState.isOpen === false) this.setMenuPositions();

    if (this.state.isOpen && this._performAutoCompleteOnUpdate) {
      this._performAutoCompleteOnUpdate = false;
      this.maybeAutoCompleteText();
    }

    this.maybeScrollItemIntoView();
  },

  maybeScrollItemIntoView: function maybeScrollItemIntoView() {
    if (this.state.isOpen === true && this.state.highlightedIndex !== null) {
      var itemNode = ReactDOM.findDOMNode(this.refs['item-' + this.state.highlightedIndex]);
      var menuNode = ReactDOM.findDOMNode(this.refs.menu);
      if (itemNode && menuNode) scrollIntoView(itemNode, menuNode, { onlyScrollIfNeeded: true });
    }
  },

  handleCompletion: function handleCompletion(event) {
    var _this = this;

    var nEvent = event.nativeEvent;
    if (this.state.isOpen === false) {
      // already selected this, do nothing
      return;
    } else if (this.state.highlightedIndex == null) {
      // hit enter after focus but before typing anything so no autocomplete attempt yet
      this.setState({
        isOpen: false
      }, function () {
        ReactDOM.findDOMNode(_this.refs.input).select();
      });
    } else {
      var item = this.getFilteredItems()[this.state.highlightedIndex];
      this.setState({
        value: this.props.getItemValue(item),
        isOpen: false,
        highlightedIndex: null
      }, function () {
        //ReactDOM.findDOMNode(this.refs.input).focus() // TODO: file issue
        ReactDOM.findDOMNode(_this.refs.input).setSelectionRange(_this.state.value.length, _this.state.value.length);
        _this.props.onSelect(_this.state.value, item, nEvent);
      });
    }
  },

  handleKeyDown: function handleKeyDown(event) {
    if (this.keyDownHandlers[event.key]) this.keyDownHandlers[event.key].call(this, event);else {
      this.setState({
        highlightedIndex: null,
        isOpen: true
      });
    }
  },

  handleChange: function handleChange(event) {
    var _this2 = this;

    this._performAutoCompleteOnKeyUp = true;
    this.setState({
      value: event.target.value
    }, function () {
      _this2.props.onChange(event, _this2.state.value);
    });
  },

  handleKeyUp: function handleKeyUp() {
    if (this._performAutoCompleteOnKeyUp) {
      this._performAutoCompleteOnKeyUp = false;
      this.maybeAutoCompleteText();
    }
  },

  keyDownHandlers: {
    ArrowDown: function ArrowDown() {
      event.preventDefault();
      var highlightedIndex = this.state.highlightedIndex;

      var index = highlightedIndex === null || highlightedIndex === this.getFilteredItems().length - 1 ? 0 : highlightedIndex + 1;
      this._performAutoCompleteOnKeyUp = true;
      this.setState({
        highlightedIndex: index,
        isOpen: true
      });
    },

    ArrowUp: function ArrowUp(event) {
      event.preventDefault();
      var highlightedIndex = this.state.highlightedIndex;

      var index = highlightedIndex === 0 || highlightedIndex === null ? this.getFilteredItems().length - 1 : highlightedIndex - 1;
      this._performAutoCompleteOnKeyUp = true;
      this.setState({
        highlightedIndex: index,
        isOpen: true
      });
    },

    Enter: function Enter(event) {
      this.handleCompletion(event);
    },

    Escape: function Escape(event) {
      this.setState({
        highlightedIndex: null,
        isOpen: false
      });
    },

    Tab: function Tab(event) {
      event.preventDefault();
      this.handleCompletion(event);
    }
  },

  getFilteredItems: function getFilteredItems() {
    var _this3 = this;

    var items = this.props.items;

    if (this.props.shouldItemRender) {
      items = items.filter(function (item) {
        return _this3.props.shouldItemRender(item, _this3.state.value);
      });
    }

    if (this.props.sortItems) {
      items.sort(function (a, b) {
        return _this3.props.sortItems(a, b, _this3.state.value);
      });
    }

    return items;
  },

  maybeAutoCompleteText: function maybeAutoCompleteText() {
    var _this4 = this;

    if (!this.props.autocompleteInputValue || this.state.value === '') return;
    var highlightedIndex = this.state.highlightedIndex;

    var items = this.getFilteredItems();
    if (items.length === 0) return;
    var matchedItem = highlightedIndex !== null ? items[highlightedIndex] : items[0];
    var itemValue = this.props.getItemValue(matchedItem);
    var itemValueDoesMatch = itemValue.toLowerCase().indexOf(this.state.value.toLowerCase()) === 0;
    if (itemValueDoesMatch) {
      var node = ReactDOM.findDOMNode(this.refs.input);
      var setSelection = function setSelection() {
        node.value = itemValue;
        node.setSelectionRange(_this4.state.value.length, itemValue.length);
      };
      if (highlightedIndex === null) this.setState({ highlightedIndex: 0 }, setSelection);else setSelection();
    }
  },

  setMenuPositions: function setMenuPositions() {
    var node = ReactDOM.findDOMNode(this.refs.input);
    var rect = node.getBoundingClientRect();
    var computedStyle = getComputedStyle(node);
    var marginBottom = parseInt(computedStyle.marginBottom, 10);
    var marginLeft = parseInt(computedStyle.marginLeft, 10);
    var marginRight = parseInt(computedStyle.marginRight, 10);
    this.setState({
      menuTop: rect.bottom + marginBottom,
      menuLeft: rect.left + marginLeft,
      menuWidth: rect.width + marginLeft + marginRight
    });
  },

  highlightItemFromMouse: function highlightItemFromMouse(index) {
    this.setState({ highlightedIndex: index });
  },

  selectItemFromMouse: function selectItemFromMouse(item, evt) {
    var _this5 = this;

    var nEvent = evt.nativeEvent;
    this.setState({
      value: this.props.getItemValue(item),
      isOpen: false,
      highlightedIndex: null
    }, function () {
      _this5.props.onSelect(_this5.state.value, item, nEvent);
      ReactDOM.findDOMNode(_this5.refs.input).focus();
      _this5.setIgnoreBlur(false);
    });
  },

  setIgnoreBlur: function setIgnoreBlur(ignore) {
    this._ignoreBlur = ignore;
  },

  renderMenu: function renderMenu() {
    var _this6 = this;

    var items = this.getFilteredItems().map(function (item, index) {
      var element = _this6.props.renderItem(item, _this6.state.highlightedIndex === index, { cursor: 'default' });
      return React.cloneElement(element, {
        onMouseDown: function onMouseDown() {
          return _this6.setIgnoreBlur(true);
        },
        onMouseEnter: function onMouseEnter() {
          return _this6.highlightItemFromMouse(index);
        },
        onClick: function onClick(evt) {
          return _this6.selectItemFromMouse(item, evt);
        },
        ref: 'item-' + index
      });
    });
    var style = {
      left: this.state.menuLeft,
      top: this.state.menuTop,
      minWidth: this.state.menuWidth
    };
    var menu = this.props.renderMenu(items, this.state.value, style);
    return React.cloneElement(menu, { ref: 'menu' });
  },

  handleInputBlur: function handleInputBlur() {
    if (this._ignoreBlur) return;
    this.setState({
      isOpen: false,
      highlightedIndex: null
    });
  },

  handleInputFocus: function handleInputFocus() {
    if (this._ignoreBlur) return;
    this.setState({ isOpen: true });
  },

  handleInputClick: function handleInputClick() {
    if (this.state.isOpen === false) this.setState({ isOpen: true });
  },

  render: function render() {
    var _this7 = this;

    if (this.props.debug) {
      // you don't like it, you love it
      _debugStates.push({
        id: _debugStates.length,
        state: this.state
      });
    }
    return React.createElement(
      'div',
      { style: { display: 'inline-block', flexGrow: 1 } },
      React.createElement('input', _extends({}, this.props.inputProps, {
        role: 'combobox',
        'aria-autocomplete': 'both',
        ref: 'input',
        onFocus: this.handleInputFocus,
        onBlur: this.handleInputBlur,
        onChange: function (event) {
          return _this7.handleChange(event);
        },
        onKeyDown: function (event) {
          return _this7.handleKeyDown(event);
        },
        onKeyUp: function (event) {
          return _this7.handleKeyUp(event);
        },
        onClick: this.handleInputClick,
        value: this.state.value
      })),
      this.state.isOpen && this.renderMenu(),
      this.props.debug && React.createElement(
        'pre',
        { style: { marginLeft: 300 } },
        JSON.stringify(_debugStates.slice(_debugStates.length - 5, _debugStates.length), null, 2)
      )
    );
  },

  focus: function focus() {
    ReactDOM.findDOMNode(this.refs.input).focus();
  },

  resetInput: function resetInput() {
    var _this8 = this;

    this.setState({ value: '' }, function () {
      _this8.props.onChange(event, _this8.state.value);
    });
  }
});

module.exports = Autocomplete;