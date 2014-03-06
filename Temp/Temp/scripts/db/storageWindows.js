/* global define: true */

// Using blocking window.localStorage, simulating async behaviour with callback
// Maybe todo: Use async. storage instead
define(['logger', 'db/storage'], function (Logger, Storage) {

    'use strict';

    function StorageWindows(configuration) {
        this.logger = new Logger(configuration);

    }

    StorageWindows.prototype = Object.create(Storage.prototype);
    StorageWindows.prototype.constructor = StorageWindows;


    StorageWindows.prototype.get = function (items, callback) {
        var db = {};

        if (typeof items === 'string') { // Only support getting one key
            db[items] = window.localStorage[items];
            if (db[items] === "undefined")
                db[items] = undefined;
            if (typeof callback === 'function')
                callback(db);
        }
    };

    StorageWindows.prototype.set = function (items, callback) {
        var key, value;

       for (var key in items) {
            value = items[key];
            if (value !== undefined)
                window.localStorage[key] = value;
        }

        if (typeof callback === 'function')
            callback();
    }

    return StorageWindows;
  
});