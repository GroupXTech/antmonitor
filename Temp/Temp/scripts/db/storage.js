/* global define: true */


define([ 'logger'], function (Logger) {

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

    Storage.prototype.get = function (getItems,callback) {
        throw new Error('Override in specialized object');

    };

    Storage.prototype.set = function (setItems,callback)
    {
        throw new Error('Override in specialized object');
    };


   return Storage;

});
