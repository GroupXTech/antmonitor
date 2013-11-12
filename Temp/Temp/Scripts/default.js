/* global: window: true, ko: true, require: true, WinJS: true, Windows: true, requirejs: true */

// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    //WinJS.log = function (message, tags, type) {
    //    if (!console[type])
    //        type = 'log';

    //    console[type](Date.now(), message, tags);

    //}

    //WinJS.Utilities.startLog();

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    var host; // ANT host

    var hostOptions;

    var hostInitCB;

    // Page handler
    var pageHandler;

    var rootVM; // Root viewmodel, contains all the other sub-view models

    // Keys for localstorage - minimize chance for accessing wrong key
    var localStorageKey = {
        temperaturemode: "temperaturemode",
        show24hMaxMin: "show24MaxMin",
        defaultDeviceId: "defaultDeviceId"

    };

    // Configure requirejs script loader

    requirejs.config({
       
        baseUrl: '../bower_components/libant',
    
        paths: {
            // Knockout viewmodels
            vm: '../../viewmodel'
        },

    });

  
    function _startKnockout(callback) {

        require(['vm/sensorVM', 'vm/temperatureVM', 'logger'], function (SensorVM, TemperatureVM, Logger) {

            // Base viewmodel

            rootVM = {
                
                settingVM: {

                    logging: ko.observable(true),     // Enable logging to console  

                    showAdditionalInfo : ko.observable(false),
                   
                    temperatureMode:  ko.observable(window.localStorage[localStorageKey.temperaturemode] || TemperatureVM.prototype.MODE.CELCIUS), // Celcius, fahrenheit
                  
                        temperatureModes : TemperatureVM.prototype.MODES,

                    // Show 24H max/min
                    show24H: ko.observable(window.localStorage[localStorageKey.show24hMaxMin] === "true" || false),     

                    //// Which device number for a specific device type, i.e ANTUSB2 (in case of multiple devices)
                    //defaultANTUSBDevice: ko.observable(Number(window.localStorage["defaultANTUSBDevice"]) || 0),

                    //// Same as in package manifest, maybe : read manifest instead, package API?
                    ANTUSBdevices: [{ name: 'ANTUSB2', vid: 4047, pid: 4104 },
                                    { name: 'ANTUSB-m', vid: 0x0FCF, pid: 0x1009 }],

                    //selectedANTUSBdevice: ko.observable(),

                },

                sensorVM: undefined,

                // Contains all enumerated devices that fullfill the USB selector
                deviceVM: {

                    enumerationCompleted : ko.observable(false),
                    enumeratedDevice: ko.observableArray(),
                    // User selected default device id.
                   
                    selectedDevice: ko.observable(),
                   
                }

            };

            // Subscribe to changes

            
            rootVM.settingVM.show24H.subscribe(function (show24h) {
                window.localStorage[localStorageKey.show24hMaxMin] = show24h;
            });

            rootVM.deviceVM.selectedDevice.subscribe(function (deviceInformation) {

                var storedDefaultDeviceId = window.localStorage[localStorageKey.defaultDeviceId];

                if (deviceInformation && (storedDefaultDeviceId !== deviceInformation.id)) {
                    window.localStorage[localStorageKey.defaultDeviceId] = deviceInformation.id;
                    exitAndResetDevice(function _initANT() {
                        // Remove previous state
                        rootVM.deviceVM.enumeratedDevice.removeAll();
                        _initANTHost(pageHandler);
                    });
                }
            });

            rootVM.settingVM.temperatureMode.subscribe(function (mode) {
                window.localStorage[localStorageKey.temperaturemode] = mode;
            });
         

            rootVM.sensorVM = new SensorVM({ log: rootVM.settingVM.logging() });

            var sensorDictionary = {};
   
            pageHandler = function (page) {
                
                //var i;
                // TEST multiple sensors for (i = 0; i < 15; i++) {
                    //var page = e.data;
                //page.sensorId = page.broadcast.channelId.getUniqueId()+i;
                page.sensorId = page.broadcast.channelId.getUniqueId();
                    //  console.log('Knockout App got message', page,e);
                    var sensorId = page.sensorId;
                    var deviceType = page.broadcast.channelId.deviceType;
                    var index;
                    var deviceTypeVM;
                   
                    // Previous registered sensor

                    if (typeof sensorDictionary[sensorId] !== 'undefined') {
                        index = sensorDictionary[sensorId];

                        // sensorVM contains array of viewmodels 
                        deviceTypeVM = rootVM.sensorVM.measurement()[index];
                        deviceTypeVM.updateFromPage(page);
                        //  console.log("Picked deviceTypeVM from index",index,deviceTypeVM);
                    }

                        // New sensor

                    else {
                        index = rootVM.sensorVM.measurement().length;
                        sensorDictionary[sensorId] = index;

                        // Allow polymorph/hetrogene (i.e temperature, heart rate) viewModels in sensorVM
                        switch (deviceType) {

                            case 25: // Temperature

                                deviceTypeVM = new TemperatureVM({
                                    logger: rootVM.sensorVM.getLogger(),
                                    temperatureMode: rootVM.settingVM.temperatureMode,
                                    sensorId: sensorId
                                });

                                break;

                            default:
                                rootVM.sensorVM.getLogger().log('warn', "No support for device type ", deviceType);
                                break;
                        }

                        // If we have a page with a device type viewmodel available, update
                        if (deviceTypeVM) {
                            deviceTypeVM.updateFromPage(page);
                            rootVM.sensorVM.measurement.push(deviceTypeVM);
                        }
                        // console.log("New deviceTypeVM at index",index,deviceTypeVM);
                    }
               // }

                // e.source.postMessage('YES IT WORKS','*');
            };

            // window.addEventListener('message', pageHandler);

            // Activate knockoutjs on our root viewmodel
            var rootElement = document.getElementById('appRoot');
            ko.applyBindings(rootVM, rootElement);

            rootElement.style.display = "block";

            callback(pageHandler);
        });

    }

    function _initANTHost(onPage) {
        require(['anthost', 'usb/USBWindows','profiles/deviceProfile_ENVIRONMENT', 'profiles/RxScanMode'],
                      function (ANTHost, USBWindows, TEMPprofile, RxScanMode) {

                          host = new ANTHost();

                          var USBoptions = {
                              //// ANT USB 2 - nRFAP2 by default
                              //vid:  0x0FCF,
                              //pid:  0x1008,
                              //device: 0,

                              // If no deviceId available, it will try to automatically connect to the first enumerated device that matches a known ANT device
                              knownDevices : rootVM.settingVM.ANTUSBdevices,

                              // Last connected device id
                              deviceId :  window.localStorage[localStorageKey.defaultDeviceId],
                              
                              log: rootVM.settingVM.logging() || false,

                              // Requested transfer size 512 bytes - allows reading of driver buffered data
                              length: { in: 64 * 8 },

                              // Subscribe to events from device watcher in the USB subsystem
                              deviceWatcher: {

                                  onAdded: function (deviceInformation) {

                                      rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                                      // rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                                      //rootVM.deviceVM.enumeratedDevice.push({ name: 'TEST USB', id: 'testid' });

                                      if (deviceInformation.id === this.usb.options.deviceId)
                                      {
                                          // Keep local storage synchronized (i.e deviceId was undefined during enumeration,
                                          // but found among the known devices.

                                          window.localStorage[localStorageKey.defaultDeviceId] = deviceInformation.id;

                                          // Update selection with the specific device please, if the select drop-down is used

                                          rootVM.deviceVM.selectedDevice(deviceInformation);
                                      }

                                    
                                  }.bind(host),

                                  onRemoved: function (deviceInformation) {
                                      rootVM.deviceVM.enumeratedDevice.remove(
                                          // predicate - compares underlying array value with a condition
                                          // http://knockoutjs.com/documentation/observableArrays.html #remove and removeAll
                                          function (value) { return value.id === deviceInformation.id; });
                                     
                                  }.bind(host),

                                  onEnumerationCompleted: function () {

                                      rootVM.deviceVM.enumerationCompleted(true);

                                      // In case deviceId is updated, during enumeration
                                      window.localStorage[localStorageKey.defaultDeviceId] = this.usb.options.deviceId;

                                      //
                                      var devInfo;
                                      for (var devNum=0;devNum<rootVM.deviceVM.enumeratedDevice().length;devNum++)
                                      {
                                          devInfo = rootVM.deviceVM.enumeratedDevice()[devNum];
                                          if (this.usb.options.deviceId === devInfo.id) {
                                              rootVM.deviceVM.selectedDevice(devInfo);
                                              break;
                                          }
                                      }


                                  }.bind(host),

                                  onStopped: function () {

                                  }.bind(host),

                                  onUpdated : function () {}.bind(host)

                              }
                          };

                          var usb = new USBWindows(USBoptions);
                          
                          hostOptions = {

                               usb: usb,

                               // Reset device during init
                               reset: true,

                               // Append extended data
                              libconfig: 'channelid,rxtimestamp',

                               //maxTransferRetries : 5, // Default = 5

                              transferProcessingLatecy: 20, // Default = 10 ms

                              log: rootVM.settingVM.logging() || false
                          };

                          

                         var onChannelEstablished = function (error, _pchannel) {
                              //console.profileEnd();

                              if (!error)
                                  this.log.log('log', 'Channel established', _pchannel);
                              else
                                  this.log.log('log', 'Failed to establish channel', error.message);

                              //        this.closeChannel(channel.establish.channelNumber, function (error,responseMsg)
                              //                          {
                              //                              if (error)
                              //                                  this.log.log('log','Failed to close channel',channel.establish.channelNumber,error.message);
                              //                              
                              //                          }.bind(this));

                          }.bind(host);

                          

                         var  channel = new RxScanMode({
                              log: rootVM.settingVM.logging() || false,
                              channelId: {
                                  deviceNumber: 0,
                                  // deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                                  deviceType: 0,
                                  transmissionType: 0
                              },
                              onPage: onPage });

                         hostInitCB = function (error) {
                              // console.trace();
                              //  console.profileEnd();
                              if (error)
                                  this.log.log('error', "ANT host - NOT - initialized, cannot establish channel on device ", error.message);
                              else {
                                  this.log.log('log', "ANT host initialized");

                                  if (this.usb.getDeviceWatcher() !== undefined)
                                      this.log.log('log', 'Host environment offers device watching capability, i.e windows 8.1');

                                  // console.profile('Establish channel');

                                 this.establishChannel({
                                      channelNumber: 0,
                                      networkNumber: 0,
                                      channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
                                      configurationName: 'slave only',
                                      channel: channel,
                                      open: true}, onChannelEstablished);
                                
                              }
                          }.bind(host);

                           host.init(hostOptions, hostInitCB);

                      });

    }

    function exitAndResetDevice(callback) {

        var _onExit = function () {
            this.log.log('log', 'Exited ANT device. I/O should be released for other applications now.');
            if (typeof callback === 'function')
                callback();
        }.bind(host);

        // Application can be terminated, so its best to reset all channels and exit just in case 
        // Seems like handlers with setTimeout is not run anymore -> has consequence for the default 500ms delay after reset

        // Don't attempt to reset if no device is available

        if (host.usb.ANTdevice) {
            // Force synchronous callback, without any delay with setTimeout
            host.options.resetDelay = 0;

            host.resetSystem(function _exitAfterResetSystem() {
                host.exit(_onExit);
            });
        }
        else
            host.exit(_onExit);

    }

    //
    // WINDOWS APP SECTION
    //

    app.onresume = function () {

        //// The old cold start init callback must be redefined for resume behavior
        //// It's called after enumeration has found a matching ANT device 
        //    host.usb._initCallback = function _initCB(err) {
             
        //        if (!err) {

        //            this.usb.listen(this.RXparse.bind(this));

        //            // If the user removes the ANT stick during standby, the channel configuration will be lost and open will fail -> must restart application to performance channel configuration once more
        //            // Normally the ANT stick is not removed
        //            // Another option: User start a new ANT application that reconfigures that channel -> gives problem
        //            // Maybe the best option: reset and reconfigure channel always
        //            this.openRxScanMode(0, function _openSent(err, msg) {

        //            if (err)
        //                this.log.log('error', err);

                    
        //        }.bind(host));
        //        }
        //        else
        //            this.log.log('error', 'Cannot resume application from standby',err);
               
        //    }.bind(host);

        //// Will enumerate devices again
        //host.usb.ANTWatcher.start();

        host.init(hostOptions, hostInitCB);

    };

    app.onactivated = function (args) {

        if (args.detail.kind === activation.ActivationKind.launch) {

            switch (args.detail.previousExecutionState) {

                default:
                    _startKnockout(_initANTHost);
                    

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
    };

   
    app.oncheckpoint = function (args) {

        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().

        
       

        // exitAndResetDevice();

        // Remove previously registered devices from UI -> enumeration will be restarted when resuming

        rootVM.deviceVM.enumeratedDevice.removeAll();

        host.closeChannel(0, function _closedSent(err,msg)
        {
            // host.usb.ANTdevice.close();
            host.usb.exit();
            var i = 1;
        })

    };

    // Why not app.onresume ?
    Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", app.onresume, false);

    app.start();


})();
