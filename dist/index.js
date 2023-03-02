/**
 * @license
 * ReduxedChromeStorage v3.0.10
 * https://github.com/hindmost/reduxed-chrome-storage
 * Copyright (c) Savr Goryaev aka hindmost
 *
 * This source code is licensed under the MIT license
 * https://github.com/hindmost/reduxed-chrome-storage/blob/master/LICENSE
 *
 * Dependencies:
 *
 * uuid v8.3.2
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.reduxedChromeStorage = {}));
})(this, (function (exports) { 'use strict';

  // Unique ID creation requires a high quality random # generator. In the browser we therefore
  // require the crypto API and do not support built-in fallback to lower quality random number
  // generators (like Math.random()).
  var getRandomValues;
  var rnds8 = new Uint8Array(16);
  function rng() {
    // lazy load so that environments that need to polyfill have a chance to do so
    if (!getRandomValues) {
      // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
      // find the complete implementation of crypto (msCrypto) on IE11.
      getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

      if (!getRandomValues) {
        throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
      }
    }

    return getRandomValues(rnds8);
  }

  var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

  function validate(uuid) {
    return typeof uuid === 'string' && REGEX.test(uuid);
  }

  /**
   * Convert array of 16 byte values to UUID string format of the form:
   * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   */

  var byteToHex = [];

  for (var i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).substr(1));
  }

  function stringify(arr) {
    var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    // Note: Be careful editing this code!  It's been tuned for performance
    // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
    var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
    // of the following:
    // - One or more input array values don't map to a hex octet (leading to
    // "undefined" in the uuid)
    // - Invalid input values for the RFC `version` or `variant` fields

    if (!validate(uuid)) {
      throw TypeError('Stringified UUID is invalid');
    }

    return uuid;
  }

  function v4(options, buf, offset) {
    options = options || {};
    var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

    rnds[6] = rnds[6] & 0x0f | 0x40;
    rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

    if (buf) {
      offset = offset || 0;

      for (var i = 0; i < 16; ++i) {
        buf[offset + i] = rnds[i];
      }

      return buf;
    }

    return stringify(rnds);
  }

  /**
   * Utility function: returns a deep copy of its argument
   */
  function cloneDeep(o) {
      return o == null || typeof o !== 'object' ?
          o :
          JSON.parse(JSON.stringify(o));
  }
  /**
   * Utility function: checks deeply if its two arguments are equal
   */
  function isEqual(a, b) {
      if (a === b)
          { return true; }
      if (a == null || typeof a !== 'object' ||
          b == null || typeof b !== 'object' ||
          Array.isArray(a) !== Array.isArray(b))
          { return false; }
      var keysA = Object.keys(a), keysB = Object.keys(b);
      if (keysA.length !== keysB.length)
          { return false; }
      for (var i = 0, list = keysA; i < list.length; i += 1) {
          var key = list[i];

          if (keysB.indexOf(key) <= -1 || !isEqual(a[key], b[key]))
              { return false; }
      }
      return true;
  }
  /**
   * Utility function: returns the deep difference between its two arguments
   */
  function diffDeep(a, b) {
      if (a === b)
          { return undefined; }
      if (a == null || typeof a !== 'object' ||
          b == null || typeof b !== 'object')
          { return a; }
      if (Array.isArray(a) || Array.isArray(b))
          { return isEqual(a, b) ? undefined : a; }
      var keysA = Object.keys(a), keysB = Object.keys(b);
      var eq = true;
      var ret = keysA.reduce(function (acc, key) {
          var diff = keysB.indexOf(key) > -1 ? diffDeep(a[key], b[key]) : a[key];
          if (typeof diff === 'undefined')
              { return acc; }
          eq = false;
          acc[key] = diff;
          return acc;
      }, {});
      keysB.forEach(function (key) {
          if (keysA.indexOf(key) > -1)
              { return; }
          eq = false;
          ret[key] = undefined;
      });
      return eq ? undefined : ret;
  }
  function mergeOrReplace(a, b, withReduction) {
      if (Array.isArray(b))
          { return cloneDeep(b); }
      if (a == null || typeof a !== 'object' || Array.isArray(a) ||
          b == null || typeof b !== 'object')
          { return cloneDeep(typeof b !== 'undefined' ? b : a); }
      var ret = Object.keys(a).concat(Object.keys(b).filter(function (key) { return !(key in a); })).reduce(function (acc, key) {
          return acc[key] = mergeOrReplace(a[key], b[key], withReduction), acc;
      }, {});
      if (!withReduction)
          { return ret; }
      var keysB = Object.keys(b);
      Object.keys(a).forEach(function (key) {
          keysB.indexOf(key) > -1 || delete ret[key];
      });
      return ret;
  }

  var packState = function (state, id, ts) { return [id, ts, state]; };
  var unpackState = function (data) {
      if (typeof data === 'undefined' || !Array.isArray(data) || data.length !== 3)
          { return [data, '', 0]; }
      var id = data[0];
      var ts = data[1];
      var state = data[2];
      return typeof id === 'string' && typeof ts === 'number' ?
          [state, id, ts] :
          [data, '', 0];
  };
  var ReduxedStorage = function ReduxedStorage(container, storage, isolated, plainActions, outdatedTimeout, localChangeListener, resetState) {
      this.container = container;
      this.storage = storage;
      this.isolated = isolated;
      this.plain = plainActions;
      this.timeout = outdatedTimeout ? Math.max(outdatedTimeout, 500) : 1000;
      this.resetState = resetState;
      this.store = this._instantiateStore();
      this.state = null;
      this.id = v4();
      this.tmstamp = 0;
      this.outdted = [];
      if (typeof localChangeListener === 'function')
          { this.lisner = localChangeListener; }
      this.lisners = [];
      this.getState = this.getState.bind(this);
      this.subscribe = this.subscribe.bind(this);
      this.dispatch = this.dispatch.bind(this);
      this.replaceReducer = this.replaceReducer.bind(this);
      this[Symbol.observable] = this[Symbol.observable].bind(this);
  };
  ReduxedStorage.prototype.init = function init () {
          var this$1$1 = this;

      this.tmstamp || this.isolated ||
          this.storage.subscribe(function (data) {
              var ref = unpackState(data);
                  var state = ref[0];
                  var id = ref[1];
                  var timestamp = ref[2];
              if (id === this$1$1.id || isEqual(state, this$1$1.state))
                  { return; }
              var newTime = timestamp >= this$1$1.tmstamp;
              if (!newTime)
                  { return; }
              this$1$1._setState(state, timestamp);
              this$1$1._renewStore();
              isEqual(state, this$1$1.state) || this$1$1._send2Storage();
              this$1$1._callListeners();
          });
      var defaultState = this.store.getState();
      // return a promise to be resolved when the last state (if any)
      // is restored from chrome.storage
      return new Promise(function (resolve) {
          this$1$1.storage.load(function (data) {
              var ref = unpackState(data);
                  var storedState = ref[0];
                  var timestamp = ref[2];
              var newState = storedState ? storedState : defaultState;
              if (this$1$1.resetState) {
                  newState = mergeOrReplace(newState, this$1$1.resetState);
              }
              this$1$1._setState(newState, timestamp);
              this$1$1._renewStore();
              isEqual(newState, storedState) || this$1$1._send2Storage();
              resolve(this$1$1);
          });
      });
  };
  ReduxedStorage.prototype.initFrom = function initFrom (state) {
      this._setState(state, 0);
      this._renewStore();
      return this;
  };
  ReduxedStorage.prototype._setState = function _setState (data, timestamp) {
      this.state = cloneDeep(data);
      timestamp = typeof timestamp !== 'undefined' ? timestamp : Date.now();
      if (timestamp > this.tmstamp) {
          this.tmstamp = timestamp;
      }
  };
  ReduxedStorage.prototype._renewStore = function _renewStore () {
          var this$1$1 = this;

      this.plain ? this.unsub && this.unsub() : this._clean();
      var store = this.store = this._instantiateStore(this.state);
      var now = Date.now();
      var n = this.outdted.length;
      this.outdted = this.outdted.map(function (ref, i) {
              var t = ref[0];
              var u = ref[1];

              return t || i >= n - 1 ? [t, u] : [now, u];
          });
      var state0 = cloneDeep(this.state);
      var unsubscribe = this.store.subscribe(function () {
          var state = store && store.getState();
          var sameStore = this$1$1.store === store;
          this$1$1._clean();
          if (isEqual(state, this$1$1.state))
              { return; }
          if (sameStore) {
              this$1$1._setState(state);
          }
          else {
              this$1$1._setState(state);
              this$1$1._renewStore();
          }
          this$1$1._send2Storage();
          this$1$1._callListeners(true, state0);
          state0 = cloneDeep(state);
      });
      if (this.plain)
          { this.unsub = unsubscribe; }
      else
          { this.outdted.push([0, unsubscribe]); }
  };
  ReduxedStorage.prototype._clean = function _clean () {
          var this$1$1 = this;

      if (this.plain)
          { return; }
      var now = Date.now();
      var n = this.outdted.length;
      this.outdted.forEach(function (ref, i) {
              var timestamp = ref[0];
              var unsubscribe = ref[1];

          if (i >= n - 1 || now - timestamp < this$1$1.timeout)
              { return; }
          unsubscribe();
          delete this$1$1.outdted[i];
      });
  };
  ReduxedStorage.prototype._instantiateStore = function _instantiateStore (state) {
      var store = this.container(state);
      if (typeof store !== 'object' || typeof store.getState !== 'function')
          { throw new Error("Invalid 'storeCreatorContainer' supplied"); }
      return store;
  };
  ReduxedStorage.prototype._send2Storage = function _send2Storage () {
      this.storage.save(packState(this.state, this.id, this.tmstamp));
  };
  ReduxedStorage.prototype._callListeners = function _callListeners (local, oldState) {
      local && this.lisner && this.lisner(this, oldState);
      for (var i = 0, list = this.lisners; i < list.length; i += 1) {
          var fn = list[i];

              fn();
      }
  };
  ReduxedStorage.prototype.getState = function getState () {
      return this.state;
  };
  ReduxedStorage.prototype.subscribe = function subscribe (fn) {
          var this$1$1 = this;

      typeof fn === 'function' && this.lisners.push(fn);
      return function () {
          if (typeof fn === 'function') {
              this$1$1.lisners = this$1$1.lisners.filter(function (v) { return v !== fn; });
          }
      };
  };
  ReduxedStorage.prototype.dispatch = function dispatch (action) {
      return this.store.dispatch(action);
  };
  ReduxedStorage.prototype.replaceReducer = function replaceReducer (nextReducer) {
      if (typeof nextReducer === 'function') {
          this.store.replaceReducer(nextReducer);
      }
      return this;
  };
  ReduxedStorage.prototype[Symbol.observable] = function () {
          var obj;

      var getState = this.getState;
      var subscribe = this.subscribe;
      return ( obj = {
          subscribe: function subscribe$1(observer) {
              if (typeof observer !== 'object' || observer === null) {
                  throw new TypeError('Expected the observer to be an object.');
              }
              function observeState() {
                  var observerAsObserver = observer;
                  observerAsObserver.next && observerAsObserver.next(getState());
              }
              observeState();
              var unsubscribe = subscribe(observeState);
              return { unsubscribe: unsubscribe };
          }
      }, obj[Symbol.observable] = function () {
              return this;
          }, obj );
  };

  var StorageAreaName;
  (function (StorageAreaName) {
      StorageAreaName["local"] = "local";
      StorageAreaName["sync"] = "sync";
  })(StorageAreaName || (StorageAreaName = {}));

  var usageSize = function (data) { return new TextEncoder().encode(Object.entries(data).map(function (ref) {
      var key = ref[0];
      var val = ref[1];

      return key + JSON.stringify(val);
      }).join('')).length; };
  var WrappedStorage = function WrappedStorage(ref) {
      var namespace = ref.namespace;
      var area = ref.area;
      var key = ref.key;

      this.ns = namespace;
      this.areaName = area === StorageAreaName.sync ? StorageAreaName.sync :
          StorageAreaName.local;
      this.key = key || 'reduxed';
      this.listeners = [];
      this.errListeners = [];
  };
  WrappedStorage.prototype.regShared = function regShared () {
          var this$1$1 = this;

      this.regListener(function (newValue, oldValue) {
          for (var i = 0, list = this$1$1.listeners; i < list.length; i += 1) {
              var listener = list[i];

                  listener(newValue, oldValue);
          }
      });
  };
  WrappedStorage.prototype.regListener = function regListener (listener) {
          var this$1$1 = this;

      this.ns.storage.onChanged.addListener(function (changes, area) {
          if (area !== this$1$1.areaName || !(this$1$1.key in changes))
              { return; }
          var ref = changes[this$1$1.key];
              var newValue = ref.newValue;
              var oldValue = ref.oldValue;
          newValue && listener(newValue, oldValue);
      });
  };
  WrappedStorage.prototype.subscribe = function subscribe (listener) {
      typeof listener === 'function' && this.listeners.push(listener);
  };
  WrappedStorage.prototype.subscribeForError = function subscribeForError (listener) {
      typeof listener === 'function' && this.errListeners.push(listener);
  };
  WrappedStorage.prototype.fireErrorListeners = function fireErrorListeners (message, exceeded) {
      for (var i = 0, list = this.errListeners; i < list.length; i += 1) {
          var listener = list[i];

              listener(message, exceeded);
      }
  };
  WrappedStorage.prototype.callbackOnLoad = function callbackOnLoad (data, callback, all) {
      callback(!this.ns.runtime.lastError && (all ? data : data && data[this.key]));
  };
  WrappedStorage.prototype.callbackOnSave = function callbackOnSave (data, area) {
          var this$1$1 = this;
          var obj;

      if (!this.ns.runtime.lastError)
          { return; }
      var ref = this.ns.runtime.lastError;
          var message = ref.message;
      if (!message || !data || !area) {
          this.fireErrorListeners(message || '', false);
          return;
      }
      var b = this.areaName === StorageAreaName.sync &&
          area.QUOTA_BYTES_PER_ITEM &&
          usageSize(( obj = {}, obj[this.key] = data, obj )) > area.QUOTA_BYTES_PER_ITEM;
      if (b) {
          this.fireErrorListeners(message, true);
          return;
      }
      this.load(function (allData) {
              var obj;

          var b = typeof allData === 'object' &&
              area.QUOTA_BYTES > 0 &&
              usageSize(Object.assign(Object.assign({}, allData), ( obj = {}, obj[this$1$1.key] = data, obj ))) > area.QUOTA_BYTES;
          this$1$1.fireErrorListeners(message, b);
      }, true);
  };

  var WrappedChromeStorage = /*@__PURE__*/(function (WrappedStorage) {
      function WrappedChromeStorage(ref) {
          var namespace = ref.namespace;
          var area = ref.area;
          var key = ref.key;

          WrappedStorage.call(this, { namespace: namespace, area: area, key: key });
          this.areaApi = this.ns.storage[this.areaName];
      }

      if ( WrappedStorage ) WrappedChromeStorage.__proto__ = WrappedStorage;
      WrappedChromeStorage.prototype = Object.create( WrappedStorage && WrappedStorage.prototype );
      WrappedChromeStorage.prototype.constructor = WrappedChromeStorage;
      WrappedChromeStorage.prototype.load = function load (fn, all) {
          var this$1$1 = this;

          typeof fn === 'function' &&
              this.areaApi.get(all ? null : this.key, function (data) {
                  this$1$1.callbackOnLoad(data, fn, all);
              });
      };
      WrappedChromeStorage.prototype.save = function save (data) {
          var this$1$1 = this;
          var obj;

          this.areaApi.set(( obj = {}, obj[this.key] = data, obj ), function () {
              this$1$1.callbackOnSave(data, this$1$1.areaApi);
          });
      };

      return WrappedChromeStorage;
  }(WrappedStorage));

  var WrappedBrowserStorage = /*@__PURE__*/(function (WrappedStorage) {
      function WrappedBrowserStorage(ref) {
          var namespace = ref.namespace;
          var area = ref.area;
          var key = ref.key;

          WrappedStorage.call(this, { namespace: namespace, area: area, key: key });
          this.areaApi = this.ns.storage[this.areaName];
      }

      if ( WrappedStorage ) WrappedBrowserStorage.__proto__ = WrappedStorage;
      WrappedBrowserStorage.prototype = Object.create( WrappedStorage && WrappedStorage.prototype );
      WrappedBrowserStorage.prototype.constructor = WrappedBrowserStorage;
      WrappedBrowserStorage.prototype.load = function load (fn, all) {
          var this$1$1 = this;

          typeof fn === 'function' &&
              this.areaApi.get(all ? null : this.key).then(function (data) {
                  this$1$1.callbackOnLoad(data, fn);
              });
      };
      WrappedBrowserStorage.prototype.save = function save (data) {
          var this$1$1 = this;
          var obj;

          this.areaApi.set(( obj = {}, obj[this.key] = data, obj )).then(function () {
              this$1$1.callbackOnSave(data, this$1$1.areaApi);
          });
      };

      return WrappedBrowserStorage;
  }(WrappedStorage));

  var Namespace;
  (function (Namespace) {
      Namespace["chrome"] = "chrome";
      Namespace["browser"] = "browser";
  })(Namespace || (Namespace = {}));
  /**
   * Sets up Reduxed Chrome Storage
   * @param storeCreatorContainer a function that calls a store creator
   * and returns the created Redux store.
   * Receives one argument to be passed as the preloadedState argument
   * into the store creator. Store creator is either the Redux's createStore()
   * or any function that wraps the createStore(), e.g. RTK's configureStore()
   * @param options
   * @param options.namespace string to identify the APIs namespace to be used,
   * either 'chrome' or 'browser'. If this and the next two options are missing,
   * the chrome namespace is used by default
   * @param options.chromeNs the chrome namespace within Manifest V2 extension.
   * If this option is supplied, the previous one is ignored
   * @param options.browserNs the browser namespace within Firefox extension,
   * or the chrome namespace within Manifest V3 chrome extension.
   * If this option is supplied, the previous two are ignored
   * @param options.storageArea the name of chrome.storage area to be used,
   * either 'local' or 'sync'. Defaults to 'local'
   * @param options.storageKey the key under which the state will be
   * stored/tracked in chrome.storage. Defaults to 'reduxed'
   * @param options.isolated check this option if your store in this specific
   * extension component isn't supposed to receive state changes from other
   * extension components. Defaults to false
   * @param options.plainActions check this option if your store is only supposed
   * to dispatch plain object actions. Defaults to false
   * @param options.outdatedTimeout max. time (in ms) to wait for outdated (async)
   * actions to be completed. Defaults to 1000. This option is ignored
   * if at least one of the previous two is checked
   * @param listeners
   * @param listeners.onGlobalChange a function to be called whenever the state
   * changes that may be caused by any extension component (popup etc.).
   * Receives two arguments:
   * 1) a temporary store representing the current state;
   * 2) the previous state
   * @param listeners.onLocalChange a function to be called whenever a store in
   * this specific extension component causes a change in the state.
   * Receives two arguments:
   * 1) reference to the store that caused this change in the state;
   * 2) the previous state
   * @param listeners.onError a function to be called whenever an error
   * occurs during chrome.storage update. Receives two arguments:
   * 1) an error message defined by storage API;
   * 2) a boolean indicating if the limit for the used storage area is exceeded
   * @returns a function that creates asynchronously a Redux store replacement
   * connected to the state stored in chrome.storage.
   * Receives one optional argument: some value to which the state
   * will be reset entirely or partially upon the store replacement creation.
   * Returns a Promise to be resolved when the created store replacement is ready
   */
  function setupReduxed(storeCreatorContainer, options, listeners) {
      var ref = options || {};
      var namespace = ref.namespace;
      var chromeNs = ref.chromeNs;
      var browserNs = ref.browserNs;
      var storageArea = ref.storageArea;
      var storageKey = ref.storageKey;
      var isolated = ref.isolated;
      var plainActions = ref.plainActions;
      var outdatedTimeout = ref.outdatedTimeout;
      var ref$1 = listeners || {};
      var onGlobalChange = ref$1.onGlobalChange;
      var onLocalChange = ref$1.onLocalChange;
      var onError = ref$1.onError;
      if (typeof storeCreatorContainer !== 'function')
          { throw new Error("Missing argument for 'storeCreatorContainer'"); }
      var storage = browserNs || namespace === Namespace.browser ?
          new WrappedBrowserStorage({
              namespace: browserNs || browser, area: storageArea, key: storageKey
          }) :
          new WrappedChromeStorage({
              namespace: chromeNs || chrome, area: storageArea, key: storageKey
          });
      typeof onGlobalChange === 'function' &&
          storage.regListener(function (data, oldData) {
              var store = new ReduxedStorage(storeCreatorContainer, storage, true, plainActions);
              var ref = unpackState(data);
              var state = ref[0];
              var ref$1 = unpackState(oldData);
              var oldState = ref$1[0];
              onGlobalChange(store.initFrom(state), oldState);
          });
      isolated || storage.regShared();
      var instantiate = function (resetState) {
          onError && storage.subscribeForError(onError);
          var store = new ReduxedStorage(storeCreatorContainer, storage, isolated, plainActions, outdatedTimeout, onLocalChange, resetState);
          return store.init();
      };
      return instantiate;
  }

  exports.cloneDeep = cloneDeep;
  exports.diffDeep = diffDeep;
  exports.isEqual = isEqual;
  exports.mergeOrReplace = mergeOrReplace;
  exports.setupReduxed = setupReduxed;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
