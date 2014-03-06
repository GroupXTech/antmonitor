/* global define: true */

// window.localStorage not available pr. 19/11-2013 for chrome packaged apps
// http://developer.chrome.com/extensions/storage.html
define(['logger', 'db/storage'], function (Logger, Storage) {

    'use strict';

    function StorageChrome(configuration) {
        this.logger = new Logger(configuration.log);
        this.storage = chrome.storage.local; // || chrome.storage.sync

    };

    StorageChrome.prototype = Object.create(Storage.prototype);
    StorageChrome.prototype.constructor = StorageChrome;

    StorageChrome.prototype.get = function (getItems, callback) {

        this.storage.get(getItems, function _getItems(items) {
            if (chrome.runtime.lastError) {
                if (this.logger && this.logger.logging) this.logger.log('error', 'Failed to get key ' + key + ' from storage', chrome.runtime.lastError);
                return;
            }

            callback(items);
        }.bind(this));
        
    };

    StorageChrome.prototype.set = function (setItems, callback) {

        this.storage.set(setItems, function _setItem() {
            if (chrome.runtime.lastError) {
                if (this.logger && this.logger.logging) this.logger.log('error', 'Failed to set key ' + key + ' in storage', chrome.runtime.lastError);
                return;
            }
            callback();
        }.bind(this));
    }

    return StorageChrome;
  
});