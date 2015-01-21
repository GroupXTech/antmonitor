/* global define: true, chrome: true, window: true    */

define(['root/generichostenvironment','messages/ResetSystemMessage'], function _requireDefineHostChrome(GenericHostEnvironment, ResetSystemMessage) {

    'use strict';

    function HostChrome(options) {

       // this.name = HostChrome.name;

        GenericHostEnvironment.call(this,options);

        this.moduleId.storage = 'db/storageChrome';
        this.moduleId.usb = 'usb/USBChrome';
    }

    HostChrome.prototype = Object.create(GenericHostEnvironment.prototype);
    HostChrome.prototype.constructor = HostChrome;

    HostChrome.prototype.onAppWindowClosed = function () {

        this.logBackgroundPage('info', "User closed app window", this);

        if (this.uiFrame) {
            this.uiFrame.postMessage('clearTimers', '*');
        }

        if (this.channel) {
            this.logBackgroundPage('log', 'Stopping channel', this.channel);
            this.channel.stop();
        }

        var resetSystemMsg = new ResetSystemMessage();
        resetSystemMsg.getRawMessage(); // implicitly set .standardMessage property with bytes to send to ANT USB endpoint

        resetSystemMsg.usb = this.host.usb.clone(); // Attach usb object for connectionHandle and interfaceNumber

        //// logBackgroundPage('log','Reset System Message',resetSystemMsg);

        try {
            this.logBackgroundPage('info', resetSystemMsg);
            this.backgroundPageWindow.postMessage({ 'reset': resetSystemMsg }, '*');
        } catch (e) // In case of e.g DOMException - An object could not be cloned
        {
            this.logBackgroundPage('error','Data clone error', e);

        }

        //window.removeEventListener('message', messageHandler);

    };

    // Logs to the background page - changes default console source
    HostChrome.prototype.logBackgroundPage = function () {

        var myArgs = [];

        if (!this.logger) {
            return;
        }

        if (!this.backgroundPageWindow) {
            if (this.logger.logging) {
                this.logger.log('warn', 'Has no reference to the background window object - cannot log to background page');
            }
                return;
        }

        var previousConsole = this.logger.console;

        if (!previousConsole) {
            if (this.logger.logging) {
                this.logger.log('warn', 'Current console is undefined - cannot log to background page');
            }
        }

        this.logger.changeConsole(this.backgroundPageWindow.console);

        if (this.logger.logging && arguments.length) {
            //debugger;
            //this.logger.log(arguments[0],arguments.slice(1));
            //console.log("slice", arguments.slice(1));
            // arguments inherit from Object.prototype, and has a length property which is the number of actual arguments passed to the function
            //this.logger.log(arguments[0], 'testing!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

            for (var argNr = 0, len = arguments.length; argNr < len; argNr++) {
                myArgs.push(arguments[argNr]);
            }

            this.logger.log.apply(this.logger, myArgs);
        }

        this.logger.changeConsole(previousConsole);

    };

    HostChrome.prototype.init = function () {

      chrome.system.display.getInfo(function (arr) { console.log("Displays",arr);});

        chrome.runtime.getBackgroundPage(function _getBackgroundPage(bgWindow) {
            var loadStr;

            this.backgroundPageWindow = bgWindow;

            loadStr = 'Loaded by ' + window.location.pathname;

            this.logBackgroundPage('info', loadStr);

        }.bind(this));

        this.appWindow = chrome.app.window.current();

        this.appWindow.onClosed.addListener(this.onAppWindowClosed.bind(this));

        this.loadSubSystems(); // USB and storage
    };

    return HostChrome;

});
