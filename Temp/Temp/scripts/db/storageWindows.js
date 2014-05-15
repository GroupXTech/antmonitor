/* global define: true */

// Using blocking window.localStorage, simulating async behaviour with callback
// Maybe todo: Use async. storage instead
define(['db/storage'], function (Storage) {

    'use strict';

    function StorageWindows(configuration) {

        Storage.call(this, configuration);

    }

    StorageWindows.prototype = Object.create(Storage.prototype);
    StorageWindows.prototype.constructor = StorageWindows;

    StorageWindows.prototype.get = function (items, callback) {
        var db,
            key,
            index,

         readKey = function _readKey()
                    {
                        var value = window.localStorage[key]
                        db[key] = value;

                        if (db[key] === "undefined")
                            db[key] = undefined;

                        if (this.logger && this.logger.logging)
                            this.logger.log('log', 'Read key ' + key + ', value ', value);

                    }.bind(this);

        if (typeof items === 'string') 
        { 
            db = {};
            key = items;
            readKey();

        } else if (Array.isArray(items))
        {
            db = {};
            for (index in items) {
                key = items[index];
                readKey();
            }
        }

        if (typeof callback === 'function')
            callback(db);
    };

    StorageWindows.prototype.set = function (items, callback) {
        var key, value;

       for (key in items) {
            value = items[key];
            if (value !== undefined) {

                window.localStorage[key] = value;

                if (this.logger && this.logger.logging)
                    this.logger.log('log', 'Wrote key ' + key + ', value ', value);
            }
        }

        if (typeof callback === 'function')
            callback();
    };

    return StorageWindows;
  
});
