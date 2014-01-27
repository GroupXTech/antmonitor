/* global define: true */

// window.localStorage not available pr. 19/11-2013 for chrome packaged apps
// http://developer.chrome.com/extensions/storage.html
define(['require', 'module', 'exports', 'logger', 'db/storage'], function (require, module, exports, Logger, Storage) {
    'use strict';

    function StorageChrome(configuration) {
        // this._logger = new Logger(configuration.log);

    }

    StorageChrome.prototype = Object.create(Storage.prototype);
    StorageChrome.prototype.constructor = StorageChrome;


    StorageChrome.prototype.get = function (key, callback) {

        chrome.storage.local.get(key, callback);
        
    };

    StorageChrome.prototype.set = function (key, value, callback) {
        chrome.storage.local.set({ key : value},callback);
    }

    module.exports = StorageChrome;
    return module.exports;
});