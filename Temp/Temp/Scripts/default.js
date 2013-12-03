/* global: window: true, ko: true, require: true, requirejs: true, document: true, window: true */

(function () {
    "use strict";

    //WinJS.log = function (message, tags, type) {
    //    if (!console[type])
    //        type = 'log';

    //    console[type](Date.now(), message, tags);

    //}

    //WinJS.Utilities.startLog();

    // Persistence object
    var storage;

    var hostAppEnvironment = getApplicationHostEnvironment();

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

    var tempConverter;
    var timezoneOffsetInMilliseconds = (new Date()).getTimezoneOffset()*-60000; // 1000 ms pr second = 60000 ms / minute

    // Configure requirejs script loader

    requirejs.config({

        baseUrl: '../bower_components/libant',

        paths: {
            // Knockout viewmodels
            vm: '../../viewmodel',
            db: '../../Scripts',
            converter: '../../converter'
        },

    });


    function _startKnockout(callback) {

        require(['vm/sensorVM', 'vm/temperatureVM', 'vm/footpodVM', 'db/storageWindows', 'logger', 'converter/temperatureConverter'], function (SensorVM, TemperatureVM, FootpodVM, Storage, Logger, TemperatureConverter) {

            // Base viewmodel

            storage = new Storage();

            tempConverter = new TemperatureConverter();

            rootVM = {

                settingVM: {

                    logging: ko.observable(true),     // Enable logging to console  

                    showAdditionalInfo: ko.observable(false),

                    showGraph: ko.observable(true),  // Trend graph

                    showCredits: ko.observable(false),

                    // temperatureMode:  ko.observable(storage.get() || TemperatureVM.prototype.MODE.CELCIUS), // Celcius, fahrenheit

                    temperatureModes: TemperatureVM.prototype.MODES,

                    // Show 24H max/min
                    // show24H: ko.observable(storage.get(localStorageKey.show24hMaxMin) === "true" || false),     

                    //// Which device number for a specific device type, i.e ANTUSB2 (in case of multiple devices)
                    //defaultANTUSBDevice: ko.observable(Number(window.localStorage["defaultANTUSBDevice"]) || 0),



                    //selectedANTUSBdevice: ko.observable(),

                },

                sensorVM: undefined,

                // Contains all enumerated devices that fullfill the USB selector
                deviceVM: {

                    enumerationCompleted: ko.observable(false),
                    enumeratedDevice: ko.observableArray(),
                    // User selected default device id.

                    selectedDevice: ko.observable(),

                }

            };

            rootVM.settingVM.toggleShowCredits = function (data, event) {
                rootVM.settingVM.showCredits(!rootVM.settingVM.showCredits())
            };

            rootVM.settingVM.toggleShowGraph = function (data, event) {
                rootVM.settingVM.showGraph(!rootVM.settingVM.showGraph());
            };

            rootVM.settingVM.toggleShowAdditionalInfo = function (data, event) {
                rootVM.settingVM.showAdditionalInfo(!rootVM.settingVM.showAdditionalInfo());
            };

            storage.get(localStorageKey.temperaturemode, function (db) {
                rootVM.settingVM.temperatureMode = ko.observable(db[localStorageKey.temperaturemode] || TemperatureVM.prototype.MODE.CELCIUS);
                storage.get(localStorageKey.show24hMaxMin, function (db) {
                    rootVM.settingVM.show24H = ko.observable(db[localStorageKey.show24hMaxMin] === "true" || false);
                    configureKnockout();
                });
            });


            function configureKnockout() {

                // Subscribe to changes


                rootVM.settingVM.show24H.subscribe(function (show24h) {
                    storage.set(localStorageKey.show24hMaxMin, show24h);
                });

                rootVM.deviceVM.selectedDevice.subscribe(function (deviceInformation) {

                    var storedDefaultDeviceId;

                    storage.get(localStorageKey.defaultDeviceId, function (db) {
                        storedDefaultDeviceId = db[localStorageKey.defaultDeviceId];

                        if (deviceInformation && (storedDefaultDeviceId !== deviceInformation.id)) {
                            storage.set(localStorageKey.defaultDeviceId, deviceInformation.id);
                            exitAndResetDevice(function _initANT() {
                                // Remove previous state
                                rootVM.deviceVM.enumeratedDevice.removeAll();
                                _initANTHost(pageHandler);
                            });
                        }
                    });


                });

                rootVM.settingVM.temperatureMode.subscribe(function (newMode) {
                    storage.set(localStorageKey.temperaturemode, newMode);

                  
                   
                    for (var chartId in sensorChart)
                    {
                     
                        if (sensorChart.hasOwnProperty(chartId)) { // Filter inherited properties if any
                            var seriesData = sensorChart[chartId].chart.series[0].data;

                            for (var point=0;point<seriesData.length;point++)
                            {
                                if (newMode === TemperatureVM.prototype.MODE.FAHRENHEIT)
                                {
                                    
                                    seriesData[point].y = tempConverter.fromCelciusToFahrenheit(seriesData[point].y);
                                } else if (newMode === TemperatureVM.prototype.MODE.CELCIUS)
                                {
                                    seriesData[point].y = tempConverter.fromFahrenheitToCelcius(seriesData[point].y);
                                }
                            }

                            //if (redrawTemperatureChartTimeoutId !== undefined)
                            //    clearTimeout(redrawTemperatureChartTimeoutId);

                            sensorChart[chartId].timestamp = Date.now();
                            sensorChart[chartId].chart.redraw();


                        }
                    }
                });

                 rootVM.settingVM.showGraph.subscribe(function (showGraph) {
                       for (var chartId in sensorChart)
                       {
                     
                        if (sensorChart.hasOwnProperty(chartId)) { 
                            switch (showGraph) {
                              case true :  
                                    sensorChart[chartId].chart.series[0].show();
                                      break;
                                    
                              case false :
                                    // Hopefully prevents redraw when hidden (ref. ignoreHiddenSeries variable)
                                    sensorChart[chartId].chart.series[0].hide();
                                      break;
                              }
                        }
                      }
                  });



                rootVM.sensorVM = new SensorVM({ log: rootVM.settingVM.logging() });

                var sensorDictionary = {},
                    redrawTemperatureChartTimeoutId, // Timer id for temp. chart redraw
                    sensorChart = {}; // Contains chart instances

                pageHandler = function (page) {

                    //var i;
                    // TEST multiple sensors for (i = 0; i < 15; i++) {
                    //var page = e.data;
                    //page.sensorId = page.broadcast.channelId.getUniqueId()+i;
                    //page.sensorId = page.broadcast.channelId.sensorId;


                    //  console.log('Knockout App got message', page,e);
                    var sensorId = page.broadcast.channelId.sensorId;
                    var deviceType = page.broadcast.channelId.deviceType;
                    var index;
                    var deviceTypeVM;
                    var handlerLogger = rootVM.sensorVM.getLogger();
                   
                    var redrawTemperatureChart = function (tempChart) {
                        //if (tempChart.timestamp === undefined) {
                        //    tempChart.timestamp = Date.now();
                        //    tempChart.chart.redraw();
                        //}
                        //else {

                        //    if (redrawTemperatureChartTimeoutId !== undefined)
                        //        clearTimeout(redrawTemperatureChartTimeoutId);

                        //    redrawTemperatureChartTimeoutId = setTimeout(function () {
                        //        tempChart.timestamp = Date.now();
                        //        tempChart.chart.redraw();
                        //    }, 60000);
                        //}
                        
                    };
                    var testNr;

                    // Previous registered sensor

                    if (typeof sensorDictionary[sensorId] !== 'undefined') {
                        index = sensorDictionary[sensorId];

                        //// sensorVM contains array of viewmodels 
                        deviceTypeVM = rootVM.sensorVM.measurement()[index];
                        deviceTypeVM.updateFromPage(page);

                        if (deviceTypeVM instanceof TemperatureVM && page.currentTemp !== undefined) {
                            if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT)
                                sensorChart[sensorId].chart.series[0].addPoint([page.timestamp+timezoneOffsetInMilliseconds, tempConverter.fromCelciusToFahrenheit(page.currentTemp)], false, sensorChart[sensorId].shift(), false);
                            else {
                                //for (testNr = 0; testNr <= 30;testNr++)
                                 // sensorChart[sensorId].chart.series[0].addPoint([page.timestamp+testNr*30, page.currentTemp], false, sensorChart[sensorId].shift(), false)
                                sensorChart[sensorId].chart.series[0].addPoint([page.timestamp+timezoneOffsetInMilliseconds, page.currentTemp], false, sensorChart[sensorId].shift(), false)
                            }
                               
                            sensorChart[sensorId].timestamp = Date.now();
                            sensorChart[sensorId].chart.redraw();
                            //redrawTemperatureChart(sensorChart[sensorId]);
                        }

                        

                        //  console.log("Picked deviceTypeVM from index",index,deviceTypeVM);
                    }

                        // New sensor

                    else {

                        index = rootVM.sensorVM.measurement().length;

                        // Allow polymorph/hetrogene (i.e temperature, heart rate) viewModels in sensorVM
                        switch (deviceType) {

                            case 25: // Temperature

                                // Mysterious transmission type = 1 unexpectedly...with valid device number and device type
                                //if (page.broadcast.channelId.transmissionType !== 149)
                                //{
                                //    if (handlerLogger.logging)
                                //        handlerLogger.log('warn', 'Cannot register temperature sensor with transmission type ', page.broadcast.channelId.transmissionType, 'expected 149', page);
                                //    break;

                                //}

                                // Add counter to filter out sensorId that come and go quickly - filter out noise

                                sensorDictionary[sensorId] = index;

                                deviceTypeVM = new TemperatureVM({
                                    logger: handlerLogger,
                                    temperatureMode: rootVM.settingVM.temperatureMode,
                                    sensorId: sensorId
                                });

                                deviceTypeVM.updateFromPage(page);
                                rootVM.sensorVM.measurement.push(deviceTypeVM);

                                // Create area temperature chart

                                //temperatureChartElement[sensorId] = document.getElementById(temperatureChartId);
                               
                                sensorChart[sensorId] = {};
                                sensorChart[sensorId].chart  = new Highcharts.Chart({
                                    chart: {
                                        renderTo: 'sensorChart-' + sensorId,
                                        backgroundColor: 'transparent',
                                        animation: false,
                                        //height: 80,
                                        //width: 200,
                                        spacing : [7,7,7,7]
                                    },

                                    credits: {
                                        enabled : false
                                    },

                                    //scrollbar: {
                                    //    enabled : false
                                    //},

                                    //navigator: {
                                    //    enabled: false
                                    //},

                                    //rangeSelector: {
                                    //    enabled: false,
                                    //    buttons: [{
                                    //        type: 'minute',
                                    //        count: 15,
                                    //        text: '15min'
                                    //    }, 
                                    //     {
                                    //        type: 'all',
                                    //        text: 'All'
                                    //    }]
                                    //},

                                    legend: {
                                        enabled: false
                                    },

                                    title: {
                                        text: '',
                                    },


                           
                                    series: [{
                                        name: 'Temperature',
                                        id: 'temperature-current-' + sensorId,
                                        data: [], // tuples [timestamp,value]
                                        type: 'spline',

                                        //marker : {
					                    //    enabled : true,
					                    //    radius : 2
				                        //},
				                      
				                        tooltip : {
					                        valueDecimals : 2,
                                             valueSuffix : '°'
				                        }
                                    }],

                                    yAxis: {
                                        title: {
                                            text: '',
                                        },

                                        min: (function () {
                                            var tempMode = rootVM.settingVM.temperatureMode();

                                                switch (tempMode) {

                                                    case TemperatureVM.prototype.MODE.CELCIUS:
                                                        return -20;

                                                    case TemperatureVM.prototype.MODE.FAHRENHEIT:
                                                        return -4;

                                                    default:
                                                        handlerLogger.log('error', 'Unknown temperature mode, cannot set minimum value for y-axis', tempMode);
                                                        break;
                                                }
                      
                                        })(),
                                       
                                        gridLineWidth: 0,

                                        labels:
                                             {
                                                 enabled: false
                                             },

                                       
                                    },

                                    xAxis: {
                                       
                                        type: 'datetime',

                                        // Turn off X-axis line
                                        lineWidth: 0,

                                        // Turn off tick-marks
                                        tickLength: 0,

                                        tickPositions: [],

                                        labels:
                                            {
                                                enabled: false
                                            },
                                       
                                    },

                                    //plotOptions: 
                                    //    {
                                           
                                    //    }

                                    
                                });

                                
                                sensorChart[sensorId].shift = function ()
                                {
                                    
                                    return  sensorChart[sensorId].chart.series[0].data.length >= 1440;
                                }

                                if (page.currentTemp !== undefined) {
                                   
                                    if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT)
                                        sensorChart[sensorId].chart.series[0].addPoint([page.timestamp + timezoneOffsetInMilliseconds, tempConverter.fromCelciusToFahrenheit(page.currentTemp)], false, sensorChart[sensorId].shift(), false);
                                    else {
                                       // for (var testNr = 0; testNr < 1440 ; testNr++) 
                                       //     sensorChart[sensorId].chart.series[0].addPoint([page.timestamp+testNr*30, page.currentTemp], false, sensorChart[sensorId].shift(), false);
                                        sensorChart[sensorId].chart.series[0].addPoint([page.timestamp+timezoneOffsetInMilliseconds, page.currentTemp], true, sensorChart[sensorId].shift(), false);

                                        //}

                                        //sensorChart[sensorId].chart.redraw();
                                    }
                                       
                                  //  redrawTemperatureChart(sensorChart[sensorId]);
                                  
                                }

                                break;

                            case 124: // Footpod

                                sensorDictionary[sensorId] = index;

                                deviceTypeVM = new FootpodVM({
                                    logger: handlerLogger,
                                    sensorId: sensorId
                                });

                                deviceTypeVM.updateFromPage(page);
                                rootVM.sensorVM.measurement.push(deviceTypeVM);

                                break;

                            default:
                                handlerLogger.log('warn', "No support for device type ", deviceType);
                                break;
                        }

                       
                        // console.log("New deviceTypeVM at index",index,deviceTypeVM);
                    }

                  

                    // e.source.postMessage('YES IT WORKS','*');
                };

                // window.addEventListener('message', pageHandler);

                // Activate knockoutjs on our root viewmodel
                var rootElement = document.getElementById('appRoot');
                ko.applyBindings(rootVM, rootElement);

                rootElement.style.display = "block";

                callback(pageHandler);
            }
        });

    }

    function _initANTHost(onPage) {
        require(['anthost', 'usb/USBWindows', 'profiles/deviceProfile_ENVIRONMENT', 'profiles/RxScanMode'],
                      function (ANTHost, USBWindows, TEMPprofile, RxScanMode) {

                          host = new ANTHost();

                          var USBoptions = {
                              //// ANT USB 2 - nRFAP2 by default
                              //vid:  0x0FCF,
                              //pid:  0x1008,
                              //device: 0,

                              // If no deviceId available, it will try to automatically connect to the first enumerated device that matches a known ANT device
                              knownDevices: [{ name: 'ANTUSB2', vid: 4047, pid: 4104 },
                                              { name: 'ANTUSB-m', vid: 0x0FCF, pid: 0x1009 }],
                              // Last connected device id
                              // deviceId :  storage.get(localStorageKey.defaultDeviceId),

                              log: rootVM.settingVM.logging() || false,

                              // Requested transfer size 512 bytes - allows reading of driver buffered data
                              length: { in: 64 * 8 },

                              // Subscribe to events from device watcher in the USB subsystem
                              deviceWatcher: {

                                  onAdded: function (deviceInformation) {

                                      rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                                      // rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                                      //rootVM.deviceVM.enumeratedDevice.push({ name: 'TEST USB', id: 'testid' });

                                      if (deviceInformation.id === this.usb.options.deviceId) {
                                          // Keep local storage synchronized (i.e deviceId was undefined during enumeration,
                                          // but found among the known devices.

                                          storage.set(localStorageKey.defaultDeviceId, deviceInformation.id);

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
                                      storage.set(localStorageKey.defaultDeviceId, this.usb.options.deviceId);

                                      //
                                      var devInfo;
                                      for (var devNum = 0; devNum < rootVM.deviceVM.enumeratedDevice().length; devNum++) {
                                          devInfo = rootVM.deviceVM.enumeratedDevice()[devNum];
                                          if (this.usb.options.deviceId === devInfo.id) {
                                              rootVM.deviceVM.selectedDevice(devInfo);
                                              break;
                                          }
                                      }


                                  }.bind(host),

                                  onStopped: function () {

                                  }.bind(host),

                                  onUpdated: function () { }.bind(host)

                              }
                          };

                          storage.get(localStorageKey.defaultDeviceId, function (db) {
                              USBoptions.deviceId = db[localStorageKey.defaultDeviceId];
                              configureUSB();
                          });

                          function configureUSB() {

                              var usb = new USBWindows(USBoptions);

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

                                  log: rootVM.settingVM.logging() || false
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

                              }.bind(host);



                              var channel = new RxScanMode({
                                  log: rootVM.settingVM.logging() || false,
                                  channelId: {
                                      deviceNumber: 0,
                                       deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                                      //deviceType: 0,
                                      transmissionType: 0
                                  },
                                  onPage: onPage
                              });

                              hostInitCB = function (error) {
                                  // console.trace();
                                  //  console.profileEnd();
                                  if (error && this.log.logging)
                                      this.log.log('error', "ANT host - NOT - initialized, cannot establish channel on device ", error.message, error.stack);
                                  else {
                                      if (this.log.logging)
                                          this.log.log('log', "ANT host initialized");

                                      if (typeof this.usb.getDeviceWatcher === 'function' && this.log.logging)
                                          this.log.log('log', 'Host environment offers device watching capability, i.e windows 8.1');

                                      // console.profile('Establish channel');

                                      this.establishChannel({
                                          channelNumber: 0,
                                          networkNumber: 0,
                                          channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
                                          configurationName: 'slave only',
                                          channel: channel,
                                          open: true
                                      }, onChannelEstablished);

                                  }
                              }.bind(host);

                              host.init(hostOptions, hostInitCB);
                          }

                      });

    }

    function exitAndResetDevice(callback) {

        var _onExit = function () {
            if (this.log.logging) this.log.log('log', 'Exited ANT device. I/O should be released for other applications now.');
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

    if (hostAppEnvironment === "windows")
        startWindowsApp();
    else if (hostAppEnvironment === "chrome")
        _startKnockout(_initANTHost);

    function startWindowsApp() {
        var app, activation;

        if (hostAppEnvironment === "windows") {
            app = WinJS.Application;
            activation = Windows.ApplicationModel.Activation;
        }

        app.onresume = function () {

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

            host.closeChannel(0, function _closedSent(err, msg) {
                // host.usb.ANTdevice.close();
                if (err && this.log.logging)
                    this.log.log('error', err);

                this.usb.exit();

            }.bind(host));

        };

        // Why not app.onresume ?
        Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", app.onresume, false);

        app.start();
    }

    // Determine app execution environment
    function getApplicationHostEnvironment() {
        // Win 8 app
        if (window.location.protocol === 'ms-appx:' || window.WinJS)
            return "windows";
        else if (window.location.protocol === 'chrome-extension:' || window.chrome)
            return "chrome";
        else
            return undefined;
    }



})();
