/* global define: true */

// Main viewmodel class
define(['require', 'module', 'exports', 'logger'], function (require, module, exports, Logger) {
    'use strict';

    function Storage(configuration) {
       // this._logger = new Logger(configuration);
      
    }

    // Keys for localstorage - minimize chance for accessing wrong key
    Storage.prototype.key = {
        temperaturemode: "temperaturemode",
        show24hMaxMin: "show24MaxMin",
        defaultDeviceId: "defaultDeviceId"

    };

    Storage.prototype.get = function (key) {
        throw new Error('Override in specialized object');

    };

    Storage.prototype.set = function (key,value)
    {
        throw new Error('Override in specialized object');
    }

    module.exports = Storage;
    return module.exports;
});