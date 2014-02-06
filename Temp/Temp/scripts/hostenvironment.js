/* global: window: true, ko: true, require: true, requirejs: true, document: true, window: true */

//debugger; 

(function ANTMonitorApp() {
    "use strict";

    //WinJS.log = function (message, tags, type) {
    //    if (!console[type])
    //        type = 'log';

    //    console[type](Date.now(), message, tags);

    //}

    //WinJS.Utilities.startLog();

    //

    // Code in this object is executed with least restriction level - so called priveliged page -, i.e a Chrome Package App is enable to access the *.chrome API
    // The ui frame running knockoutjs is not able to access this API when running in a sandbox 
    // I am aiming for a hybrid application that has the same code base for both the Windows Store app and Chrome 
    
    function HostEnvironment()
    {
      
        var requirejsConfiguration,
            deps;

        this.name = 'Host environment';

        if (!requirejs) {
            console.error('Application depend upon using requirejs as a script loader, it was not found on the window object');
            
            return;
        } else
            console.info('Script module loader : Requirejs ' + requirejs.version);

        if (!this.isUIFramePresent()) {
            console.error('Application must have an UI frame');
            return;
        }

        this.uiFrameReady = false;

        // Used for sending a page message to UI
        this.pageFromDeviceProfile = { page: undefined };

        Object.defineProperty(this, "executionEnvironment",
                             {
                                 get: function () { return this._executionEnvironment; },
                                 set: function (newValue) { this._executionEnvironment = newValue; }
                             });

        // Setup receiver of message events

        window.addEventListener('message', this.onmessage.bind(this)); // Force this on the message callback

        setTimeout(function () {
            if (!this.uiFrameReady) {
                if (this.logger && this.logger.logging) this.logger.log('warn', 'Has not received ready from ui frame - messages will probably not reach ui frame');
            }
        }.bind(this), 3000);

        
        // Important that the startup code runs immediately, otherwise Windows App will not start (i.e cannot move this code inside the requirejs callback)
        // It seems like the app.onlaunched callback is not executed

        this.findExecutionEnvironment();

        console.info(this.name + ' location: ' + window.location.href);

        console.info('Browser', window.navigator.userAgent, window.navigator.platform);

        if (this.isWindowsHost()) {
            console.info(this.name + ' is a windows host');
            this.startWinApp();
        }
        else if (this.isChromeHost()) {
            console.info(this.name + ' is a chrome host',window.navigator.userAgent,window.navigator.platform);
            this.start(); // Life-cycle events, i.e onLaunched is handled in background.js
        }
        else {
            console.error('Unable to determine host execution environment - currently supported Win 8 and Chrome Packaged App');

        }

        //if (!(requirejs && Highcharts && HighchartsAdapter)) {
        //    console.error('Application requires libraries; requirejs, Highcharts and HighchartsAdapter (standalone)');
        //    return;
        //}

        //// Start if all dependant libraries are ready


        //console.info(Highcharts.product + ' ' + Highcharts.version);

        //// Standalone adapter
        //console.info(Highcharts.product + ' adapter', HighchartsAdapter);

        // Configure requirejs script loader

        requirejsConfiguration = {

            baseUrl: '../bower_components/libant',

            paths: {

                // Persistence

                db: '../../scripts/db',
                root : '../..'

            },

            waitSeconds: 180  // For debugging, so that I can set breakpoints before timeout

        };

        requirejs.config(requirejsConfiguration);
       
        deps = ['logger'];
        
        requirejs(deps, function (Logger) {

            this.logger = new Logger(true);

        }.bind(this));

    }
  
    HostEnvironment.prototype.PROTOCOL = {
        MS : 'ms-appx:',
        CHROME : 'chrome-extension:'
    };

    // Get messages from embedded UI frame, in Chrome it runs in a sandbox mode to avoid content security policy restrictions
     HostEnvironment.prototype.onmessage = function (event)
    {
        

        var sourceWindow = event.source,
            data = event.data;

        // Skip unknown protocols if available
        //if (sourceWindow && (sourceWindow.location.protocol !== HostEnvironment.prototype.PROTOCOL.MS) && (sourceWindow.location.protocol !== HostEnvironment.prototype.PROTOCOL.CHROME))
        //{
        //    if (this.logger && this.logger.logging) {
        //        this.logger.log('error', 'Received message event from source with a protocol that cannot be handled');
        //        return;
        //    }
             
        //}

        if (this.logger && this.logger.logging) this.logger.log('info', ' received message event', event);

        // UI frame ready 
        if (data === 'ready')
        {
            this.uiFrameReady = true;
           
            this.uiFrame = window.frames[0];
            if (this.logger && this.logger.logging) 
                this.logger.log('log', 'UI frame ready to process messages');
           
                this.uiFrame.postMessage('ready', '*');
            
        }

    }

    // Receives page from device profile and forwards it to the UI frame
    HostEnvironment.prototype.onpage = function (page)
    {
        if (this.logger && this.logger.logging)
            this.logger.log('log', this.name+' received page', page);
        
        if (typeof page.clone === 'function')
            this.pageFromDeviceProfile.page = page.clone();
        else
          this.pageFromDeviceProfile.page = page;
        // Possible exception here DataCloneError -> try catch block ? IE 11
        try {
            //setTimeout(function () {
            //for (var i = 0; i <= 10000;i++)
            window.pageFromDeviceProfile = page; // FOR DEBUGGING dataclone error (misses local variabels during debugging in IE 11/VS 2013);
                this.uiFrame.postMessage(this.pageFromDeviceProfile, '*');
           // }.bind(this), 0);
        } catch (e)
        {
            if (this.logger && this.logger.logging)
                this.logger.log('error', ' error', error, 'page from device profile', this.pageFromDeviceProfile);
        }
    }

    // Host environment must hava a UI frame in the document
    HostEnvironment.prototype.isUIFramePresent = function ()
    {
        var frame = document.getElementById('uiFrame');
        if (frame === undefined)
            return false;
        else
            return true;
    }

    // Determine app execution environment
    HostEnvironment.prototype.findExecutionEnvironment = function ()
    {  
            var protocol = window.location.protocol;

            // Win 8 app
            if (protocol === HostEnvironment.prototype.PROTOCOL.MS || window.WinJS) {
                this.executionEnvironment = "windows";
            }
                // Chrome Packaged App
            else if (protocol === HostEnvironment.prototype.PROTOCOL.CHROME || window.chrome)
                this.executionEnvironment = "chrome";
            else
                this.executionEnvironment = undefined;

    }

    HostEnvironment.prototype.logToChromeBackgroundPage = function ()
    {
        if (!this.backgroundPageWindow)
        {
            if (this.logger && this.logger.logging)
                this.logger.log('error', this.name+' has no reference to the chrome background page window, cannot log any information');
        }
    }

    // Handle chrome onClosed event
    HostEnvironment.prototype.onAppWindowClosed = function ()
    {
        
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

    // Require ANT host and USB and start initialization
    HostEnvironment.prototype.start = function ()
    {
        var storageModuleId,
             USBModuleId;
         
        // Load subsystem according to host environment

        if (this.isWindowsHost()) {
            storageModuleId = 'db/storageWindows';
            USBModuleId = 'usb/USBWindows';
        }
        else if (this.isChromeHost()) {

            chrome.runtime.getBackgroundPage(function (bgWindow) {

                var loadStr;

                this.backgroundPageWindow = bgWindow;

                loadStr = this.name+' loaded by '+window.location.pathname;

                bgWindow.console.info(Date.now(), loadStr);

                if (this.logger && this.logger.logging)
                    this.logger.log('info', loadStr);

            }.bind(this));

            this.appWindow = chrome.app.window.current();

            this.appWindow.onClosed.addListener(this.onAppWindowClosed.bind(this));
                
            storageModuleId = 'db/storageChrome';
            USBModuleId = 'usb/USBChrome';
        }

        if (!USBModuleId || !storageModuleId) {
            
            if (this.logger && this.logger.logging) this.logger.log('error', 'Cannot load either USB or storage module', USBModuleId, storageModuleId);
            return;
        }

        require(['anthost', USBModuleId, 'profiles/environment/deviceProfile_ENVIRONMENT', 'profiles/RxScanMode', storageModuleId, 'logger'],
            this.onSubsystemLoaded.bind(this));

    }

   
    // Start as a windows app
    HostEnvironment.prototype.startWinApp = function () {

        var app = WinJS.Application,
            activation = Windows.ApplicationModel.Activation;

       

        app.onresume = function () {

            this.host.init(this.host.options, this.host.options.initCB);

        }.bind(this);

        app.onactivated = function (args) {

            if (args.detail.kind === activation.ActivationKind.launch) {

                switch (args.detail.previousExecutionState) {

                    default:
                        //this._startKnockout();
                        this.start();


                        break;
                }

                args.setPromise(WinJS.UI.processAll());

            }

            // Auto play

            //else if (args.detail.lind === activation.ActivationKind.device)
            //{
            //    // Not implemented yet

            //    //console.log("Autoplay activation", args);

            //}
        }.bind(this);

        app.oncheckpoint = function (args) {

            // TODO: This application is about to be suspended. Save any state
            // that needs to persist across suspensions here. You might use the
            // WinJS.Application.sessionState object, which is automatically
            // saved and restored across suspension. If you need to complete an
            // asynchronous operation before your application is suspended, call
            // args.setPromise().

            // exitAndResetDevice();

            // Remove previously registered devices from UI -> enumeration will be restarted when resuming
            var rootVM = this.viewModel.rootVM;

            rootVM.deviceVM.enumeratedDevice.removeAll();

            this.host.closeChannel(0, function _closedSent(err, msg) {
                // host.usb.ANTdevice.close();
                if (err && this.log.logging)
                    this.log.log('error', err);

                this.usb.exit();

            }.bind(this.host));

        }.bind(this);

        // Why not app.onresume ?
        Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", app.onresume, false);

        app.start();
    };

    // Is the execution environment windows?
    HostEnvironment.prototype.isWindowsHost = function () {
        
        if (!this.executionEnvironment)
        {
            this.findExecutionEnvironment();
        }

        return this.executionEnvironment === "windows";
    };

    // Is the execution environment chrome?
    HostEnvironment.prototype.isChromeHost = function () {
        
        if (!this.executionEnvironment) {
            this.findExecutionEnvironment();
        }

        return this.executionEnvironment === "chrome";
    };


    //ANTMonitorUI.prototype.exitAndResetDevice = function (callback) {
    //    var _onExit = function () {
    //        if (this.log.logging) this.log.log('log', 'Exited ANT device. I/O should be released for other applications now.');
    //        if (typeof callback === 'function')
    //            callback();
    //    }.bind(host);

    //    // Application can be terminated, so its best to reset all channels and exit just in case 
    //    // Seems like handlers with setTimeout is not run anymore -> has consequence for the default 500ms delay after reset

    //    // Don't attempt to reset if no device is available

    //    if (host.usb.ANTdevice) {
    //        // Force synchronous callback, without any delay with setTimeout
    //        host.options.resetDelay = 0;

    //        host.resetSystem(function _exitAfterResetSystem() {
    //            host.exit(_onExit);
    //        });
    //    }
    //    else
    //        host.exit(_onExit);
    //}

    var hostEnvironment = new HostEnvironment();

})(); // Enclose in separate lexical environment by convention (to not interfere with the global object/environment)
