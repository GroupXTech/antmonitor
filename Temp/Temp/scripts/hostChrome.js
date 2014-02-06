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

    HostChrome.prototype.onAppWindowClosed = function () {
       
            //logBackgroundPage('info', "User requested close of application");
            //var resetSystemMsg = new ResetSystemMessage();
            //resetSystemMsg.getRawMessage(); // implicitly set .standardMessage property with bytes to send to ANT USB endpoint

            //resetSystemMsg.usb = host.usb; // Attach usb object for connectionHandle and interfaceNumber

            //// Device watcher gives DOMException
            //resetSystemMsg.usb.options.deviceWatcher = undefined;

            //// logBackgroundPage('log','Reset System Message',resetSystemMsg);

            //try {
            //    backgroundPageWindow.postMessage({ 'reset': resetSystemMsg }, '*');
            //} catch (e) // In case of e.g DOMException - An object could not be cloned
            //{
            //    logBackgroundPage('error', e);
            //}

            //window.removeEventListener('message', messageHandler);
        
    }

    HostChrome.prototype.init = function ()
    {
        chrome.runtime.getBackgroundPage(function (bgWindow) {
            var loadStr;

            this.backgroundPageWindow = bgWindow;

            loadStr = this.name+' loaded by '+window.location.pathname;

            this.backgroundPageWindow = bgWindow;

            bgWindow.console.info(Date.now(),loadStr);

            if (this.logger && this.logger.logging)
                this.logger.log('info', loadStr);

        }.bind(this));

        this.appWindow = chrome.app.window.current();

        this.appWindow.onClosed.addListener(this.onAppWindowClosed.bind(this));

        this.loadSubSystems();
    }

    return HostChrome;

});