/* global define: true, WinJS: true, Windows: true */

// Depends upon requirejs

define(['root/generichostenvironment'], function _requireDefineHostWin81 (GenericHostEnvironment) {
    'use strict';

    function HostWin81(options) {

        // this.name = HostWin81.name;

        GenericHostEnvironment.call(this,options);

        this.moduleId.storage = 'db/storageWindows';
        this.moduleId.usb = 'usb/USBWindows';
       
    }

    HostWin81.prototype = Object.create(GenericHostEnvironment.prototype);
    HostWin81.prototype.constructor = HostWin81;

    HostWin81.prototype.handleLifeCycleEvents = function () {

        var app = WinJS.Application;

        app.oncheckpoint = function (args) {

            // TODO: This application is about to be suspended. Save any state
            // that needs to persist across suspensions here. You might use the
            // WinJS.Application.sessionState object, which is automatically
            // saved and restored across suspension. If you need to complete an
            // asynchronous operation before your application is suspended, call
            // args.setPromise().

            
            if (this.logger && this.logger.logging)
                this.logger.log('info', 'Lifecycle event SUSPEND');

            this.host.closeChannel(0, function _closedSent(err, msg) {
                // host.usb.ANTdevice.close();
                if (err && this.log.logging)
                    this.log.log('error', err);

                this.usb.exit();

            }.bind(this.host));

        }.bind(this);

        app.onresume = function () {

            if (this.logger && this.logger.logging)
                this.logger.log('info', 'Lifecycle event RESUME');

            this.host.init(this.host.options, this.onHostInit.bind(this));

        }.bind(this);

        // Why not app.onresume ?
        Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", app.onresume, false);
    };

    HostWin81.prototype.init = function () {
        this.handleLifeCycleEvents();
        this.loadSubSystems(); // usb and storage
    };

    return HostWin81;

});
