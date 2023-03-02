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
        return true;
    if (a == null || typeof a !== 'object' ||
        b == null || typeof b !== 'object' ||
        Array.isArray(a) !== Array.isArray(b))
        return false;
    const keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
    for (const key of keysA) {
        if (keysB.indexOf(key) <= -1 || !isEqual(a[key], b[key]))
            return false;
    }
    return true;
}
/**
 * Utility function: returns the deep difference between its two arguments
 */
function diffDeep(a, b) {
    if (a === b)
        return undefined;
    if (a == null || typeof a !== 'object' ||
        b == null || typeof b !== 'object')
        return a;
    if (Array.isArray(a) || Array.isArray(b))
        return isEqual(a, b) ? undefined : a;
    const keysA = Object.keys(a), keysB = Object.keys(b);
    let eq = true;
    const ret = keysA.reduce((acc, key) => {
        const diff = keysB.indexOf(key) > -1 ? diffDeep(a[key], b[key]) : a[key];
        if (typeof diff === 'undefined')
            return acc;
        eq = false;
        acc[key] = diff;
        return acc;
    }, {});
    keysB.forEach(key => {
        if (keysA.indexOf(key) > -1)
            return;
        eq = false;
        ret[key] = undefined;
    });
    return eq ? undefined : ret;
}
function mergeOrReplace(a, b, withReduction) {
    if (Array.isArray(b))
        return cloneDeep(b);
    if (a == null || typeof a !== 'object' || Array.isArray(a) ||
        b == null || typeof b !== 'object')
        return cloneDeep(typeof b !== 'undefined' ? b : a);
    const ret = Object.keys(a).concat(Object.keys(b).filter(key => !(key in a))).reduce((acc, key) => {
        return acc[key] = mergeOrReplace(a[key], b[key], withReduction), acc;
    }, {});
    if (!withReduction)
        return ret;
    const keysB = Object.keys(b);
    Object.keys(a).forEach(key => {
        keysB.indexOf(key) > -1 || delete ret[key];
    });
    return ret;
}

const packState = (state, id, ts) => [id, ts, state];
const unpackState = (data) => {
    if (typeof data === 'undefined' || !Array.isArray(data) || data.length !== 3)
        return [data, '', 0];
    const [id, ts, state] = data;
    return typeof id === 'string' && typeof ts === 'number' ?
        [state, id, ts] :
        [data, '', 0];
};
class ReduxedStorage {
    constructor(container, storage, isolated, plainActions, outdatedTimeout, localChangeListener, resetState) {
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
            this.lisner = localChangeListener;
        this.lisners = [];
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.dispatch = this.dispatch.bind(this);
        this.replaceReducer = this.replaceReducer.bind(this);
        this[Symbol.observable] = this[Symbol.observable].bind(this);
    }
    init() {
        this.tmstamp || this.isolated ||
            this.storage.subscribe((data) => {
                const [state, id, timestamp] = unpackState(data);
                if (id === this.id || isEqual(state, this.state))
                    return;
                const newTime = timestamp >= this.tmstamp;
                if (!newTime)
                    return;
                this._setState(state, timestamp);
                this._renewStore();
                isEqual(state, this.state) || this._send2Storage();
                this._callListeners();
            });
        const defaultState = this.store.getState();
        // return a promise to be resolved when the last state (if any)
        // is restored from chrome.storage
        return new Promise(resolve => {
            this.storage.load(data => {
                const [storedState, , timestamp] = unpackState(data);
                let newState = storedState ? storedState : defaultState;
                if (this.resetState) {
                    newState = mergeOrReplace(newState, this.resetState);
                }
                this._setState(newState, timestamp);
                this._renewStore();
                isEqual(newState, storedState) || this._send2Storage();
                resolve(this);
            });
        });
    }
    initFrom(state) {
        this._setState(state, 0);
        this._renewStore();
        return this;
    }
    _setState(data, timestamp) {
        this.state = cloneDeep(data);
        timestamp = typeof timestamp !== 'undefined' ? timestamp : Date.now();
        if (timestamp > this.tmstamp) {
            this.tmstamp = timestamp;
        }
    }
    _renewStore() {
        this.plain ? this.unsub && this.unsub() : this._clean();
        const store = this.store = this._instantiateStore(this.state);
        const now = Date.now();
        const n = this.outdted.length;
        this.outdted = this.outdted.map(([t, u], i) => t || i >= n - 1 ? [t, u] : [now, u]);
        let state0 = cloneDeep(this.state);
        const unsubscribe = this.store.subscribe(() => {
            const state = store && store.getState();
            const sameStore = this.store === store;
            this._clean();
            if (isEqual(state, this.state))
                return;
            if (sameStore) {
                this._setState(state);
            }
            else {
                this._setState(state);
                this._renewStore();
            }
            this._send2Storage();
            this._callListeners(true, state0);
            state0 = cloneDeep(state);
        });
        if (this.plain)
            this.unsub = unsubscribe;
        else
            this.outdted.push([0, unsubscribe]);
    }
    _clean() {
        if (this.plain)
            return;
        const now = Date.now();
        const n = this.outdted.length;
        this.outdted.forEach(([timestamp, unsubscribe], i) => {
            if (i >= n - 1 || now - timestamp < this.timeout)
                return;
            unsubscribe();
            delete this.outdted[i];
        });
    }
    _instantiateStore(state) {
        const store = this.container(state);
        if (typeof store !== 'object' || typeof store.getState !== 'function')
            throw new Error(`Invalid 'storeCreatorContainer' supplied`);
        return store;
    }
    _send2Storage() {
        this.storage.save(packState(this.state, this.id, this.tmstamp));
    }
    _callListeners(local, oldState) {
        local && this.lisner && this.lisner(this, oldState);
        for (const fn of this.lisners) {
            fn();
        }
    }
    getState() {
        return this.state;
    }
    subscribe(fn) {
        typeof fn === 'function' && this.lisners.push(fn);
        return () => {
            if (typeof fn === 'function') {
                this.lisners = this.lisners.filter(v => v !== fn);
            }
        };
    }
    dispatch(action) {
        return this.store.dispatch(action);
    }
    replaceReducer(nextReducer) {
        if (typeof nextReducer === 'function') {
            this.store.replaceReducer(nextReducer);
        }
        return this;
    }
    [Symbol.observable]() {
        const getState = this.getState;
        const subscribe = this.subscribe;
        return {
            subscribe(observer) {
                if (typeof observer !== 'object' || observer === null) {
                    throw new TypeError('Expected the observer to be an object.');
                }
                function observeState() {
                    const observerAsObserver = observer;
                    observerAsObserver.next && observerAsObserver.next(getState());
                }
                observeState();
                const unsubscribe = subscribe(observeState);
                return { unsubscribe };
            },
            [Symbol.observable]() {
                return this;
            }
        };
    }
}

var StorageAreaName;
(function (StorageAreaName) {
    StorageAreaName["local"] = "local";
    StorageAreaName["sync"] = "sync";
})(StorageAreaName || (StorageAreaName = {}));

const usageSize = (data) => new TextEncoder().encode(Object.entries(data).map(([key, val]) => key + JSON.stringify(val)).join('')).length;
class WrappedStorage {
    constructor({ namespace, area, key }) {
        this.ns = namespace;
        this.areaName = area === StorageAreaName.sync ? StorageAreaName.sync :
            StorageAreaName.local;
        this.key = key || 'reduxed';
        this.listeners = [];
        this.errListeners = [];
    }
    regShared() {
        this.regListener((newValue, oldValue) => {
            for (const listener of this.listeners) {
                listener(newValue, oldValue);
            }
        });
    }
    regListener(listener) {
        this.ns.storage.onChanged.addListener((changes, area) => {
            if (area !== this.areaName || !(this.key in changes))
                return;
            const { newValue, oldValue } = changes[this.key];
            newValue && listener(newValue, oldValue);
        });
    }
    subscribe(listener) {
        typeof listener === 'function' && this.listeners.push(listener);
    }
    subscribeForError(listener) {
        typeof listener === 'function' && this.errListeners.push(listener);
    }
    fireErrorListeners(message, exceeded) {
        for (const listener of this.errListeners) {
            listener(message, exceeded);
        }
    }
    callbackOnLoad(data, callback, all) {
        callback(!this.ns.runtime.lastError && (all ? data : data && data[this.key]));
    }
    callbackOnSave(data, area) {
        if (!this.ns.runtime.lastError)
            return;
        const { message } = this.ns.runtime.lastError;
        if (!message || !data || !area) {
            this.fireErrorListeners(message || '', false);
            return;
        }
        const b = this.areaName === StorageAreaName.sync &&
            area.QUOTA_BYTES_PER_ITEM &&
            usageSize({ [this.key]: data }) > area.QUOTA_BYTES_PER_ITEM;
        if (b) {
            this.fireErrorListeners(message, true);
            return;
        }
        this.load((allData) => {
            const b = typeof allData === 'object' &&
                area.QUOTA_BYTES > 0 &&
                usageSize(Object.assign(Object.assign({}, allData), { [this.key]: data })) > area.QUOTA_BYTES;
            this.fireErrorListeners(message, b);
        }, true);
    }
}

class WrappedChromeStorage extends WrappedStorage {
    constructor({ namespace, area, key }) {
        super({ namespace, area, key });
        this.areaApi = this.ns.storage[this.areaName];
    }
    load(fn, all) {
        typeof fn === 'function' &&
            this.areaApi.get(all ? null : this.key, data => {
                this.callbackOnLoad(data, fn, all);
            });
    }
    save(data) {
        this.areaApi.set({ [this.key]: data }, () => {
            this.callbackOnSave(data, this.areaApi);
        });
    }
}

class WrappedBrowserStorage extends WrappedStorage {
    constructor({ namespace, area, key }) {
        super({ namespace, area, key });
        this.areaApi = this.ns.storage[this.areaName];
    }
    load(fn, all) {
        typeof fn === 'function' &&
            this.areaApi.get(all ? null : this.key).then(data => {
                this.callbackOnLoad(data, fn);
            });
    }
    save(data) {
        this.areaApi.set({ [this.key]: data }).then(() => {
            this.callbackOnSave(data, this.areaApi);
        });
    }
}

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
    const { namespace, chromeNs, browserNs, storageArea, storageKey, isolated, plainActions, outdatedTimeout } = options || {};
    const { onGlobalChange, onLocalChange, onError } = listeners || {};
    if (typeof storeCreatorContainer !== 'function')
        throw new Error(`Missing argument for 'storeCreatorContainer'`);
    const storage = browserNs || namespace === Namespace.browser ?
        new WrappedBrowserStorage({
            namespace: browserNs || browser, area: storageArea, key: storageKey
        }) :
        new WrappedChromeStorage({
            namespace: chromeNs || chrome, area: storageArea, key: storageKey
        });
    typeof onGlobalChange === 'function' &&
        storage.regListener((data, oldData) => {
            const store = new ReduxedStorage(storeCreatorContainer, storage, true, plainActions);
            const [state] = unpackState(data);
            const [oldState] = unpackState(oldData);
            onGlobalChange(store.initFrom(state), oldState);
        });
    isolated || storage.regShared();
    const instantiate = (resetState) => {
        onError && storage.subscribeForError(onError);
        const store = new ReduxedStorage(storeCreatorContainer, storage, isolated, plainActions, outdatedTimeout, onLocalChange, resetState);
        return store.init();
    };
    return instantiate;
}

export { cloneDeep, diffDeep, isEqual, mergeOrReplace, setupReduxed };
