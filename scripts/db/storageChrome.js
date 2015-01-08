/* global define: true, chrome: true */

// window.localStorage not available pr. 19/11-2013 for chrome packaged apps
// Reason for not using: Blocking synchronous I/O
// http://developer.chrome.com/extensions/storage.html
define(['db/storage'], function (Storage) {

    'use strict';

    function StorageChrome(configuration) {

        Storage.call(this, configuration);

        this.storage = chrome.storage.local; // || chrome.storage.sync

        this.storage.get(null, function (db) {

          if (this.logger && this.logger.logging)
            this.logger.log('info','Local storage contents',db);

        }.bind(this));

    }

    StorageChrome.prototype = Object.create(Storage.prototype);
    StorageChrome.prototype.constructor = StorageChrome;

    // Override
    StorageChrome.prototype.get = function (getItems, callback) {

      var requestedItems = getItems; // Enable scope variable inspection on outer closure (why isnt getItems available? Maybe due to .bind)

        this.storage.get(getItems, function _getItems(items) {

            if (chrome.runtime.lastError) {
                if (this.logger && this.logger.logging) this.logger.log('error', 'Failed to get items',requestedItems,'from storage', chrome.runtime.lastError);
                return;
            }

            if (this.logger && this.logger.logging) this.logger.log('log', 'READ',getItems,items);

            callback(items);

        }.bind(this));

    };

    // Override/shadow parent function
    StorageChrome.prototype.set = function (setItems, callback) {

        this.storage.set(setItems, function _setItem() {

            if (chrome.runtime.lastError) {
                if (this.logger && this.logger.logging) this.logger.log('error', 'Failed to set items',setItems,' in storage', chrome.runtime.lastError);
                return;
            }

            if (this.logger && this.logger.logging) this.logger.log('log', 'WRITE',setItems);

            callback();

        }.bind(this));
    };

    return StorageChrome;

});
