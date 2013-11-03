// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.log = function (message, tags, type) {
        if (!console[type])
            type = 'log';

        console[type](Date.now(), message, tags);

    }

    WinJS.Utilities.startLog();

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    var host; // ANT host

    var rootVM; // Root viewmodel, contains all the other sub-view models

    requirejs.config({
        //By default load any module IDs from bower_components/libant
        baseUrl: '../bower_components/libant',
        //except, if the module ID starts with "app",
        //load it from the js/app directory. paths
        //config is relative to the baseUrl, and
        //never includes a ".js" extension since
        //the paths config could be for a directory.
        paths: {
            // Knockout viewmodels
            vm: '../../viewmodel'
        },

    });

    // Why not app.onresume ?
    Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", function _resumingHandler() {
       
        host.init(hostOptions, hostInitCB);
    }, false);

    function _startKnockout(callback) {

        require(['vm/sensorVM', 'vm/temperatureVM', 'logger'], function (SensorVM, TemperatureVM, Logger) {

            rootVM = {

                settingVM: {
                    logging: ko.observable(true),     // Enable logging to console  
                    temperatureMode: ko.observable(), // Celcius, fahrenheit
                    show24H: ko.observable(false)     // Show 24H max/min

                },

                sensorVM: undefined,

                deviceVM: {
                    device: ko.observableArray(),
                    selectedDevice: ko.observable()
                }

            };
            //
            rootVM.deviceVM.selectedDevice.subscribe(function (newValue) {
                console.log("Selected device", newValue);
            });


            rootVM.settingVM.temperatureMode(TemperatureVM.prototype.MODE.CELCIUS);
            rootVM.settingVM.temperatureModes = TemperatureVM.prototype.MODES;

            // TEST: Click-handler for show24H

            rootVM.settingVM.enable24H = function () {
                this.show24H(true);
            }.bind(rootVM.settingVM);


            rootVM.sensorVM = new SensorVM({ log: rootVM.settingVM.logging() });

            var deviceTypeVM;

            var sensorDictionary = {};
            var logger = new Logger({ log: true });


            var pageHandler = function (page) {
                 //var page = e.data;
                 page.sensorId = page.broadcast.channelId.getUniqueId();
                //  console.log('Knockout App got message', page,e);
                var sensorId = page.sensorId;
                var deviceType = page.broadcast.channelId.deviceType;
                var index;

                // Previous registered sensor

                if (typeof sensorDictionary[sensorId] !== 'undefined') {
                    index = sensorDictionary[sensorId];
                    deviceTypeVM = rootVM.sensorVM.measurement()[index];
                    deviceTypeVM.updateFromPage(page);
                    //  console.log("Picked deviceTypeVM from index",index,deviceTypeVM);
                }

                // New sensor

                else
                {
                    index = rootVM.sensorVM.measurement().length;
                    sensorDictionary[sensorId] = index;

                    // Allow polymorph/hetrogene (i.e temperature, heart rate) viewModels in sensorVM
                    switch (deviceType) {
                        case 25: // temperature

                            deviceTypeVM = new TemperatureVM({
                                logger: rootVM.sensorVM.getLogger(),
                                temperatureMode: rootVM.settingVM.temperatureMode,
                                sensorId : sensorId
                            });

                            break;

                        default:

                            logger.log('warn', "No support for device type ", deviceType);
                            break;
                    }

                    deviceTypeVM.updateFromPage(page);
                    rootVM.sensorVM.measurement.push(deviceTypeVM);
                    // console.log("New deviceTypeVM at index",index,deviceTypeVM);
                }

                // e.source.postMessage('YES IT WORKS','*');
            };

            // window.addEventListener('message', pageHandler);

            // Activate knockoutjs on our root viewmodel
            ko.applyBindings(rootVM, document.getElementById('appRoot'));

            callback(pageHandler);
        });

    }

    function _initANTHost(onPage) {
        require(['anthost', 'usb/USBWindows','profiles/deviceProfile_ENVIRONMENT', 'profiles/RxScanMode'],
                      function (ANTHost, USBWindows, TEMPprofile, RxScanMode) {

                        

                          host = new ANTHost();

                          var USBoptions = {
                              // ANT USB 2 - nRFAP2
                              vid: 4047,
                              pid: 4104,
                              device: 0, // Pick the first device, if multiple devices found
                              log: true,
                              length: { in: 64 * 8 }, // Requested transfer size 512 bytes - allows reading of driver buffered data

                              // Subscribe to events from device watcher in the USB subsystem
                              deviceWatcher: {

                                  onAdded: function (deviceInformation) {
                                      rootVM.deviceVM.device.push(deviceInformation);
                                    
                                  }.bind(host),

                                  onRemoved: function (deviceInformation) {
                                      var removedDeviceInformation = rootVM.deviceVM.device.remove(
                                          // predicate - compares underlying array value with a condition
                                          // http://knockoutjs.com/documentation/observableArrays.html #remove and removeAll
                                          function (value) { return value.id === deviceInformation.id; });
                                     
                                  }.bind(host),

                                  onEnumerationComplete: function () {

                                  }.bind(host),

                                  onStopped: function () {

                                  }.bind(host),

                                  onUpdated : function () {}.bind(host)

                              }
                          };

                          var usb = new USBWindows(USBoptions);
                          
                          var hostOptions = {
                              usb: usb,
                              reset: true,
                              libconfig: 'channelid,rxtimestamp',
                              //maxTransferRetries : 5, // Default = 5
                              transferProcessingLatecy: 20, // Default = 10 ms
                              log: true
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
                              log: true,
                              channelId: {
                                  deviceNumber: 0,
                                  // deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                                  deviceType: 0,
                                  transmissionType: 0
                              },
                              onPage: onPage });

                         var hostInitCB = function (error) {
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

    app.onactivated = function (args) {

        if (args.detail.kind === activation.ActivationKind.launch) {

            switch (args.detail.previousExecutionState) {

                case activation.ApplicationExecutionState.terminated:
                    // May deviate from default later...
                    _startKnockout(_initANTHost)
                   
                    break;

                default:
                    _startKnockout(_initANTHost);
                    break;
            }


            args.setPromise(WinJS.UI.processAll());
        }
    };

    app.oncheckpoint = function (args) {

        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().


        var _onExit = function () {
            this.log.log('log', 'Exited ANT device');
        }.bind(host);

        // Application can be terminated, so its best to reset all channels and exit just in case 
        // Seems like handlers with setTimeout is not run anymore -> has consequence for the default 500ms delay after reset

        // Force synchronous callback, without any delay with setTimeout
        host.options.resetDelay = 0;

        host.resetSystem(function () {
            host.exit(_onExit);
        })

    };

    app.start();


})();
