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
                if (this.logger && this.logger.logging) this.logger.log('error', 'Has not received ready from ui frame - cannot send messages from host environment');
            }
        }.bind(this), 1000);

        
        // Important that the startup code runs immediately, otherwise Windows App will not start (i.e cannot move this code inside the requirejs callback)
        // It seems like the app.onlaunched callback is not executed

        this.findExecutionEnvironment();

        console.info(this.name + ' location: ' + window.location.href);

        if (this.isWindowsHost())
            this.startWinApp();
        else if (this.isChromeHost())
            this.start(); // Life-cycle events, i.e onLaunched is handled in background.js
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

        if (this.logger && this.logger.logging) this.logger.log('info', this.name + ' received message event', event);

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
        
        this.pageFromDeviceProfile.page = page;

        this.uiFrame.postMessage(this.pageFromDeviceProfile, '*');
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

    // Initialization of ANT host and USB
    HostEnvironment.prototype.onSubsystemLoaded = function (ANTHost, USBHost, TEMPprofile, RxScanMode, Storage, Logger)
    {
       

        //   var rootVM = this.viewModel.rootVM;

        this.storage = new Storage();

            this.host = new ANTHost();

            var USBoptions = {

                log:  true,

                // Requested transfer size 512 bytes - allows reading of driver buffered data

                length: { in: 64 * 8 },

                // Windows 8 USB: Subscribe to events from device watcher in the USB subsystem

                deviceWatcher: {

                    onAdded: function (deviceInformation) {
                        var host = this.host;

                        //rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                        //// rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                        ////rootVM.deviceVM.enumeratedDevice.push({ name: 'TEST USB', id: 'testid' });

                        //if (deviceInformation.id === host.usb.options.deviceId) {
                        //    // Keep local storage synchronized (i.e deviceId was undefined during enumeration,
                        //    // but found among the known devices.

                        //    this.storage.set(this.storage.__proto__.key.defaultDeviceId, deviceInformation.id);

                        //    // Update selection with the specific device please, if the select drop-down is used

                        //    rootVM.deviceVM.selectedDevice(deviceInformation);
                        //}

                    }.bind(this),

                    onRemoved: function (deviceInformation) {
                        //// Remove from UI
                        //rootVM.deviceVM.enumeratedDevice.remove(
                        //    // predicate - compares underlying array value with a condition
                        //    // http://knockoutjs.com/documentation/observableArrays.html #remove and removeAll
                        //    function (value) { return value.id === deviceInformation.id; });

                    }.bind(this.host),

                    onEnumerationCompleted: function () {

                        var host = this.host;

                        //rootVM.deviceVM.enumerationCompleted(true);

                        //// In case deviceId is updated, during enumeration
                        //if (host.usb.options.deviceId)
                        //    this.storage.set(this.storage.__proto__.key.defaultDeviceId, host.usb.options.deviceId);

                        ////
                        //var devInfo;
                        //for (var devNum = 0; devNum < rootVM.deviceVM.enumeratedDevice().length; devNum++) {
                        //    devInfo = rootVM.deviceVM.enumeratedDevice()[devNum];
                        //    if (host.usb.options.deviceId === devInfo.id) {
                        //        rootVM.deviceVM.selectedDevice(devInfo);
                        //        break;
                        //    }
                        //}

                    }.bind(this),

                    onStopped: function () { }.bind(this.host),

                    onUpdated: function () { }.bind(this.host)

                }
            };

            this.storage.get(this.storage.__proto__.key.defaultDeviceId, function (db) {

                USBoptions.deviceId = db[this.storage.__proto__.key.defaultDeviceId];
                configureUSB.bind(this)();
            }.bind(this));

            function configureUSB() {

                var usb = new USBHost(USBoptions),
                    hostOptions,
                    hostInitCB;

                hostOptions = {

                    usb: usb,

                    // Reset device during init
                    reset: true,

                    // Append extended data
                    libconfig: 'channelid,rxtimestamp,rssi',

                    //maxTransferRetries : 5, // Default = 5

                    // Increased to 2 seconds to allow for handling buffered data (typically broadcasts) by driver (WINUSB)
                    // at start without any resending
                    transferProcessingLatency: 2000, // Default = 10 ms

                    log:  true
                };

                var onChannelEstablished = function (error, _pchannel) {
                    //console.profileEnd();

                    if (!error && this.log.logging)
                        this.log.log('log', 'Channel established', _pchannel);
                    else if (this.log.logging)
                        this.log.log('log', 'Failed to establish channel', error.message);

                    //        this.closeChannel(channel.establish.channelNumber, function (error,responseMsg)
                    //                          {
                    //                              if (error)
                    //                                  this.log.log('log','Failed to close channel',channel.establish.channelNumber,error.message);
                    //                              
                    //                          }.bind(this));

                }.bind(this.host);

                var channel = new RxScanMode({
                    log:  false,
                    channelId: {
                        deviceNumber: 0,
                        //  deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                        deviceType: 0,
                        transmissionType: 0
                    },
                    onPage: this.onpage.bind(this)
                });

                hostInitCB = function (error) {
                    // console.trace();
                    //  console.profileEnd();
                    if (error &&  this.logger && this.logger.logging)
                        this.logger.log('error', "ANT host - NOT - initialized, cannot establish channel on device ", error.message, error.stack);
                    else {
                        if (this.logger && this.logger.logging)
                            this.logger.log('log', "ANT host initialized");

                        if (typeof this.host.usb.getDeviceWatcher === 'function' && this.logger && this.logger.logging)
                            this.logger.log('log', 'Host environment offers device watching capability, e.g windows 8.1');

                        // console.profile('Establish channel');

                        this.host.establishChannel({
                            channelNumber: 0,
                            networkNumber: 0,
                            // channelPeriod will be ignored for RxScanMode channel
                            channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
                            configurationName: 'slave only',
                            channel: channel,
                            open: true
                        }, onChannelEstablished);

                    }
                }.bind(this);

                this.host.init(hostOptions, hostInitCB);
            }

        
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
