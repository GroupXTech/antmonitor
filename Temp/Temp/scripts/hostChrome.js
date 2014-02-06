// Depends upon requirejs

define(['root/generichostenvironment'], function _requireDefine(GenericHostEnvironment) {
    'use strict';

    function HostChrome() {
        GenericHostEnvironment.call(this);
        this.name = "hostChrome";

        this.moduleId.storage = 'db/storageChrome';
        this.moduleId.usb = 'usb/USBChrome';
    }

    HostChrome.prototype = Object.create(GenericHostEnvironment.prototype);
    HostChrome.constructor = HostChrome;

    HostChrome.prototype.init = function ()
    {
        this.loadSubSystems();
    }

    return HostChrome;

});