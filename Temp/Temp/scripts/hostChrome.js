﻿// Depends upon requirejs

define(['root/generichostenvironment','messages/ResetSystemMessage'], function _requireDefineHostChrome(GenericHostEnvironment, ResetSystemMessage) {
    'use strict';

    function HostChrome(options) {
        GenericHostEnvironment.call(this,options);
        this.name = "hostChrome";

        this.moduleId.storage = 'db/storageChrome';
        this.moduleId.usb = 'usb/USBChrome';
    }

    HostChrome.prototype = Object.create(GenericHostEnvironment.prototype);
    HostChrome.constructor = HostChrome;

    HostChrome.prototype.onAppWindowClosed = function () {
       
           this.backgroundPageWindow.console.info("User closed app window",this);
            var resetSystemMsg = new ResetSystemMessage();
            resetSystemMsg.getRawMessage(); // implicitly set .standardMessage property with bytes to send to ANT USB endpoint

            resetSystemMsg.usb = this.host.usb; // Attach usb object for connectionHandle and interfaceNumber

            // Device watcher gives DOMException
            resetSystemMsg.usb.options.deviceWatcher = undefined;

            resetSystemMsg.usb.log = undefined;

            //// logBackgroundPage('log','Reset System Message',resetSystemMsg);

        try {
            
                this.backgroundPageWindow.postMessage({ 'reset': resetSystemMsg }, '*');
            } catch (e) // In case of e.g DOMException - An object could not be cloned
            {
                this.backgroundPageWindow.console.error('Data clone error', e);
                //this.logBackgroundPage('error', e);
            }

            //window.removeEventListener('message', messageHandler);
        
    }

    

    // Logs to the background page
    HostChrome.prototype.logBackgroundPage = function ()
    {
        var myArgs = [],
            type;

        if (!this.logger) {
            return;
        }

        if (!this.backgroundPageWindow)
        {
            if (this.logger.logging)
                this.logger.log('warn', 'Has no reference to the background window object - cannot log to background page');
            return;
        }
           
        var previousConsole = this.logger.console;

        if (!previousConsole) {
            if (this.logger.logging)
                this.logger.log('warn','Current console is undefined - cannot log to background page');
        }

        this.logger.changeConsole(this.backgroundPageWindow.console);

        if (this.logger.logging && arguments.length) {
            //debugger;
            //this.logger.log(arguments[0],arguments.slice(1));
            //console.log("slice", arguments.slice(1));
            // arguments inherit from Object.prototype, and has a length property which is the number of actual arguments passed to the function
            //this.logger.log(arguments[0], 'testing!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
           
            myArgs.push(arguments[0]); // type info,error etc.

            for (var argNr = 1, len = arguments.length; argNr < len; argNr++)
            {
                myArgs.push(arguments[argNr]);
            }

            

            this.logger.log.apply(this.logger, myArgs);
        }

        this.logger.changeConsole(previousConsole);
       

    }

    HostChrome.prototype.init = function ()
    {

        chrome.runtime.getBackgroundPage(function (bgWindow) {
            var loadStr;

            this.backgroundPageWindow = bgWindow;

            loadStr = this.name + ' loaded by ' + window.location.pathname;

   
            this.logBackgroundPage('info',loadStr);

        }.bind(this));

        this.appWindow = chrome.app.window.current();

        this.appWindow.onClosed.addListener(this.onAppWindowClosed.bind(this));

        this.loadSubSystems(); // USB and storage
    }

    return HostChrome;

});