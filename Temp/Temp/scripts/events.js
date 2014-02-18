// Somewhat based on https://github.com/joyent/node/blob/828f14556e0daeae7fdac08fceaa90952de63f73/lib/events.js

define(function _requireDefineEventEmitter() {
    function EventEmitter() {
        this._events = {};
    }

    function checkListener  (listener) {
        if (typeof listener !== 'function')
            throw new TypeError('The provided listener is not a function');
    };

    EventEmitter.prototype.addEventListener = function (type, listener) {
        checkListener(listener);

        if (!this._events[type])
            this._events[type] = [];

        this._events[type].push(listener);

        return this;
    };

    EventEmitter.prototype.removeEventListener = function (type, listener) {
        var listeners, index;

        checkListener(listener);

        listeners = this._events[type];

        if (!listeners)
            return this;

        index = listeners.indexOf(listener);

        if (index !== -1)
            listeners.splice(index, 1);

        return this;

    };

    EventEmitter.prototype.removeAllEventListeners = function (type) {
        var listeners = this._events[type];

        if (!listeners)
            return this;

        // The old listeners array should be removed by GC
        this._events[type] = [];

        return this;
    };


    EventEmitter.prototype.emit = function (type) {
        var listeners = this._events[type],
            index,
            listener,
            args = [],
            argNr,
            len;

        if (!listeners)
            return false;

        // Setup arguments passed to listener
        for (argNr = 1, len = arguments.length; argNr < len; argNr++)
            args.push(arguments[argNr]);

        for (index = 0, len = listeners.length; index < len; index++) {
            listeners[index].apply(this, args);

        }

        return true;

    };
    return EventEmitter;
}
);

