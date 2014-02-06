/* global: window: true, ko: true, require: true, requirejs: true, document: true, window: true */


(function HostLoaderIIFE() {
    "use strict";

    // Determine execution environment and load the appropiate host
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

            baseUrl: '../bower_components/libant',

            paths: {

                // Persistence

                db: '../../scripts/db',
                root: '../../scripts'

            },

            waitSeconds: 180  // For debugging, so that I can set breakpoints before timeout

        };

        requirejs.config(requirejsConfiguration);

       

    }

    HostLoader.prototype.initWin81LifeCycle = function ()
    {
        var app = WinJS.Application,
            activation = Windows.ApplicationModel.Activation;



        app.onactivated = function (args) {

            if (args.detail.kind === activation.ActivationKind.launch) {

                switch (args.detail.previousExecutionState) {

                    default:
                      
                        if (this.host)
                            this.host.init();
                        else
                            console.error('Failed to initialize win81 host - no host object available - most likely requirejs load timing issues')

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

    }

    HostLoader.prototype.init = function ()


    {
        var deps = ['logger'];

        if (this.hostEnvironmentModuleId) {

            // Cannot start windows app inside callback/setTimeout for some unknown reason - maybe time constraints

            if (this.isWindowsHost())
                this.initWin81LifeCycle();
           

            deps.push(this.hostEnvironmentModuleId);

            requirejs(deps, function (Logger, Host) {
               // console.log(Date.now(),'require finished')
                this.logger = new Logger(true);
                this.host = new Host({ log: true });
                if (this.isChromeHost())
                    this.host.init();
            }.bind(this));

        }
    }

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
    }
   
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

    }

   

    var hostLoader = new HostLoader();
    
        hostLoader.init();
    
    

})(); // Enclose in separate lexical environment by convention (to not interfere with the global object/environment)
