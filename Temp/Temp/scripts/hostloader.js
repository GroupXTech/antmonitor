/* global: window: true, ko: true, require: true, requirejs: true, document: true, window: true */

// Requirejs

// https://github.com/jrburke/requirejs/blob/master/LICENSE

// Knockoutjs

// http://opensource.org/licenses/mit-license.php

// Highcharts

// http://creativecommons.org/licenses/by-nc/3.0/


(function HostLoaderIIFE() {
    'use strict';

    // Determine execution environment and load the appropiate host module

    function HostLoader() {

        var requirejsConfiguration,
            deps;

        this.name = 'Host loader';

        this.executionEnvironment = undefined;

        this.hostEnvironmentModuleId = undefined;

        if (!requirejs) {
            console.error('Application depend upon using requirejs as a script loader, it was not found on the window object');

            return;
        } else
            console.info('Script module loader : Requirejs ' + requirejs.version);

        // Important that the startup code runs immediately, otherwise Windows App will not start (i.e cannot move this code inside the requirejs callback)
        // It seems like the app.onlaunched callback is not executed

        this.findExecutionEnvironment();

        console.info(this.name + ' location: ' + window.location.href);

        console.info('Host navigator', window.navigator.userAgent, window.navigator.platform);

        // Configure requirejs script loader

        requirejsConfiguration = {

            baseUrl: '../bower_components/libant', // Relative to file directory

            paths: {

                db: '../../scripts/db',  // Persistence
                root: '../../scripts'   // Path names are releative to baseUrl and not file directory

            },

            waitSeconds: 180  // For debugging, so that I can set breakpoints before timeout

        };

        console.info('Requirejs configuration', requirejsConfiguration);


        requirejs.config(requirejsConfiguration);

    }

    // It seems like the app.start must take place in the HostLoader object - cannot move it into hostWin81.js
    HostLoader.prototype.initWin81LifeCycle = function ()
    {
        var app = WinJS.Application,
            activation = Windows.ApplicationModel.Activation;

        app.onactivated = function (args) {

            if (args.detail.kind === activation.ActivationKind.launch) {

                switch (args.detail.previousExecutionState) {

                    default:
                      
                        this.loadAndInit();
                       

                        break;
                }

                args.setPromise(WinJS.UI.processAll());

            }

            // Auto play

            //else if (args.detail.kind === activation.ActivationKind.device)
            //{
            //    // Not implemented yet

            //    console.log("Autoplay activation", args);

            //}

        }.bind(this);

        app.start();

    };

    HostLoader.prototype.loadAndInit = function ()
    {
        var deps = ['logger'];

        // Maybe fix: would break optimization with r?

        deps.push(this.hostEnvironmentModuleId);
       
        requirejs(deps, function (Logger, Host,Events) {
            // console.log(Date.now(),'require finished')
            this.logger = new Logger({ log: true });
            this.host = new Host({ log: true });
           
                this.host.init();
        }.bind(this));
    };

    HostLoader.prototype.init = function ()
   {
       

        if (this.hostEnvironmentModuleId) {

            // Cannot start windows app inside callback/setTimeout for some unknown reason - maybe time constraints

            if (this.isWindowsHost())
                this.initWin81LifeCycle();
            else
                this.loadAndInit();
          
        }
    };

    HostLoader.prototype.PROTOCOL = {
        MS: 'ms-appx:',
        CHROME: 'chrome-extension:'
    };

    // Host environment must hava a UI frame in the document
    HostLoader.prototype.isUIFramePresent = function () {
        var frame = document.getElementById('uiFrame');
        if (frame === undefined)
            return false;
        else
            return true;
    };
   
    // Is the execution environment windows?
    HostLoader.prototype.isWindowsHost = function () {

        if (!this.executionEnvironment) {
            this.findExecutionEnvironment();
        }

        return this.executionEnvironment === "windows";
    };

    // Is the execution environment chrome?
    HostLoader.prototype.isChromeHost = function () {

        if (!this.executionEnvironment) {
            this.findExecutionEnvironment();
        }

        return this.executionEnvironment === "chrome";
    };

    // Determine app execution environment
    HostLoader.prototype.findExecutionEnvironment = function () {
        var protocol = window.location.protocol;

        // Win 8 app
        if (protocol === HostLoader.prototype.PROTOCOL.MS || window.WinJS) {
            this.executionEnvironment = "windows";
            this.hostEnvironmentModuleId = 'root/hostWin81';
        }
            // Chrome Packaged App
        else if (protocol === HostLoader.prototype.PROTOCOL.CHROME || window.chrome) {
            this.executionEnvironment = "chrome";
            this.hostEnvironmentModuleId = 'root/hostChrome';
        }
        else {
            this.executionEnvironment = undefined;
            this.hostEnvironmentModuleId = undefined;
        }

    };

   

    var hostLoader = new HostLoader();
    
        hostLoader.init();
    
    

})(); // Enclose in separate lexical environment by convention (to not interfere with the global object/environment)
