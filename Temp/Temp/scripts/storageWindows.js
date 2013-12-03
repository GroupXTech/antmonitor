/* global define: true */

// Using blocking window.localStorage, simulating async behaviour with callback
// Maybe todo: Use async. storage instead
define(['require', 'module', 'exports', 'logger','db/storage'], function (require, module, exports, Logger, Storage) {
    'use strict';

    function StorageWindows(configuration) {
        // this._logger = new Logger(configuration.log);

    }

    StorageWindows.prototype = Object.create(Storage.prototype);
    StorageWindows.prototype.constructor = StorageWindows;


    StorageWindows.prototype.get = function (key, callback) {
        var db = {};
        db[key] = window.localStorage[key];
      if (typeof callback === 'function')
        callback(db);
    };

    StorageWindows.prototype.set = function (key, value, callback) {
        window.localStorage[key] = value;
        if (typeof callback === 'function')
            callback();
    }

    module.exports = StorageWindows;
    return module.exports;
});