/* global: window: true, ko: true, require: true, requirejs: true, document: true, window: true */

(function ANTMonitorApp() {
    "use strict";

    //WinJS.log = function (message, tags, type) {
    //    if (!console[type])
    //        type = 'log';

    //    console[type](Date.now(), message, tags);

    //}

    //WinJS.Utilities.startLog();

    function ANTMonitorUI() {

        this.hostAppEnvironment = this.getApplicationHostEnvironment();

        if (!(requirejs && Highcharts && HighchartsAdapter)) {
            console.error('Application requires libraries; requirejs, Highcharts and HighchartsAdapter (standalone)');
            return;
        }

        // Start if all dependant libraries are ready

        console.info('Requirejs ' + requirejs.version);

        console.info(Highcharts.product + ' ' + Highcharts.version);

        // Standalone adapter
        console.info(Highcharts.product + ' adapter', HighchartsAdapter);

        // Configure requirejs script loader
        requirejs.config({

            baseUrl: '../bower_components/libant',

            paths: {
                // Knockout viewmodels
                vm: '../../scripts/viewmodel',
                db: '../../scripts/db',
                converter: '../../scripts/converter'
            },

        });

        this.sensorChart = {};

        this.host = undefined; // defined in _initANTHost

        // Holds timer id for all used setTimeout/setInterval 
        this.timerID = {};

        this.timezoneOffsetInMilliseconds = this.getTimezoneOffset();

        // Persistence object
        this.storage = undefined;

        if (this.isWindowsHost())
            this.startAsWindowsApp();
        else if (this.isChromeHost())
            this._startKnockout(this._initANTHost);

    }

    ANTMonitorUI.prototype.getTimezoneOffset = function () {
        return (new Date()).getTimezoneOffset() * -60000; // 1000 ms pr second = 60000 ms / minute
    }

    ANTMonitorUI.prototype.isWindowsHost = function () {
        return this.hostAppEnvironment === "windows";
    };

    ANTMonitorUI.prototype.isChromeHost = function () {
        return this.hostAppEnvironment === "chrome";
    };

    // Determine app execution environment
    ANTMonitorUI.prototype.getApplicationHostEnvironment = function () {
        var protocol = window.location.protocol;

        // Win 8 app
        if (protocol === 'ms-appx:' || window.WinJS)
            return "windows";
            // Chrome packaged App
        else if (protocol === 'chrome-extension:' || window.chrome)
            return "chrome";
        else
            return undefined;
    };

    ANTMonitorUI.prototype.initViewModels = function (SensorVM, TemperatureVM, FootpodVM, HRMVM, SPDCADVM, Storage, Logger, TemperatureConverter) {

        var rootVM; // Root viewmodel, contains all the other sub-view models
        var tempModeKey;

        // Holds knockoutjs viewmodel constructor functions and root
        this.viewModel = {};

        this.viewModel.SensorVM = SensorVM;
        this.viewModel.TemperatureVM = TemperatureVM;
        this.viewModel.FootpodVM = FootpodVM;
        this.viewModel.HRMVM = HRMVM;
        this.viewModel.SPDCADVM = SPDCADVM;

        // Holds references to the viewmodel for a particular sensor (using sensorId based on ANT channelId)

        this.viewModel.sensorDictionary = {};

        if (Storage)
            this.storage = new Storage();

        this.tempConverter = new TemperatureConverter();

        this.viewModel.rootVM = {

            settingVM: {

                logging: ko.observable(true),     // Enable logging to console  - will decrease performance

                showAdditionalInfo: ko.observable(false),

                showCredits: ko.observable(false),

                temperatureModes: TemperatureVM.prototype.MODES,

            },

            // Holds an array on viewmodels for the sensors that are discovered
            sensorVM: undefined,

            // Contains all enumerated devices that fullfill the USB selector
            deviceVM: {

                enumerationCompleted: ko.observable(false),
                enumeratedDevice: ko.observableArray(),
                // User selected default device id.

                selectedDevice: ko.observable(),

            }

        };

        rootVM = this.viewModel.rootVM;

        rootVM.settingVM.toggleShowCredits = function (data, event) {
            rootVM.settingVM.showCredits(!rootVM.settingVM.showCredits());
        };

        rootVM.settingVM.toggleShowAdditionalInfo = function (data, event) {
            rootVM.settingVM.showAdditionalInfo(!rootVM.settingVM.showAdditionalInfo());
        };

        tempModeKey = this.storage.__proto__.key.temperaturemode;

        this.storage.get(tempModeKey, function _fetchTemperatureMode(db) {

            var show24hMaxMinKey = this.storage.__proto__.key.show24hMaxMin;

            rootVM.settingVM.temperatureMode = ko.observable(db[tempModeKey] || TemperatureVM.prototype.MODE.CELCIUS);

            this.storage.get(show24hMaxMinKey, function _fetchShow24hMaxMin(db) {

                rootVM.settingVM.show24H = ko.observable(db[show24hMaxMinKey] === "true" || false);
                
                this.configureKnockout();

            }.bind(this));

        }.bind(this));

    };

    ANTMonitorUI.prototype._startKnockout = function () {

        var currentStorageFunc,
            dependencies;

        if (this.isWindowsHost())
            currentStorageFunc = 'db/storageWindows';
        else if (this.isChromeHost())
            currentStorageFunc = 'db/storage'
            

        dependencies = ['vm/sensorVM', 'vm/temperatureVM', 'vm/footpodVM', 'vm/HRMVM', 'vm/SPDCADVM', currentStorageFunc, 'logger', 'converter/temperatureConverter'];

        require(dependencies, this.initViewModels.bind(this));

    };

    ANTMonitorUI.prototype.configureKnockout = function () {

        var rootVM = this.viewModel.rootVM;

        // Subscribe to changes

        rootVM.settingVM.show24H.subscribe(function (show24h) {
            this.storage.set(this.storage.__proto__.key.show24hMaxMin, show24h);
        }.bind(this));

        rootVM.deviceVM.selectedDevice.subscribe(function (deviceInformation) {

            var storedDefaultDeviceId;

            this.storage.get(this.storage.__proto__.key.defaultDeviceId, function (db) {
                storedDefaultDeviceId = db[this.storage.__proto__.key.defaultDeviceId];

                if (deviceInformation && (storedDefaultDeviceId !== deviceInformation.id)) {
                    this.storage.set(this.storage.__proto__.key.defaultDeviceId, deviceInformation.id);
                    this.exitAndResetDevice(function _initANT() {
                        // Remove previous state
                        rootVM.deviceVM.enumeratedDevice.removeAll();
                        this._initANTHost(pageHandler);
                    }.bind(this));
                }
            }.bind(this));

        }.bind(this));

        rootVM.settingVM.temperatureMode.subscribe(function (newMode) {

            var temperatureAxis = this.sensorChart.integrated.chart.yAxis[0],
                seriesData,
                TemperatureVM = this.viewModel.TemperatureVM;

            this.storage.set(this.storage.__proto__.key.temperaturemode, newMode);

            for (var serieNr = 0; serieNr < this.sensorChart.integrated.chart.series.length; serieNr++) {

                if (this.sensorChart.integrated.chart.series[serieNr].name.indexOf('Temperature') !== -1) {
                    seriesData = this.sensorChart.integrated.chart.series[serieNr].options.data;

                    // Convert y-point to requested temperature mode

                    for (var point = 0; point < seriesData.length; point++) {
                        if (newMode === TemperatureVM.prototype.MODE.FAHRENHEIT) {

                            seriesData[point][1] = this.tempConverter.fromCelciusToFahrenheit(seriesData[point][1]);


                        } else if (newMode === TemperatureVM.prototype.MODE.CELCIUS) {
                            seriesData[point][1] = this.tempConverter.fromFahrenheitToCelcius(seriesData[point][1]);

                            temperatureAxis.setExtremes(-20, null, false);
                        }

                    }

                    if (newMode === TemperatureVM.prototype.MODE.FAHRENHEIT)
                        temperatureAxis.setExtremes(-4, null, false);
                    else if (newMode === TemperatureVM.prototype.MODE.CELCIUS)
                        temperatureAxis.setExtremes(-20, null, false);

                    this.sensorChart.integrated.chart.series[serieNr].setData(this.sensorChart.integrated.chart.series[serieNr].options.data, false, false);

                }

            }

            this.redrawIntegratedChart();

        }.bind(this));

        rootVM.sensorVM = new this.viewModel.SensorVM({ log: rootVM.settingVM.logging() });

        // window.addEventListener('message', pageHandler);

        // Activate knockoutjs on our root viewmodel

        var rootElement = document.getElementById('appRoot');

        ko.applyBindings(rootVM, rootElement);

        rootElement.style.display = "block";

        this.createIntegratedChart();

        // bind sets the BoundThis property of this.PageHandler to this
        this._initANTHost(this.onpage.bind(this));
    };

    ANTMonitorUI.prototype.createIntegratedChart = function () {

        var rootVM = this.viewModel.rootVM,
            antUI = this;

        if (!this.sensorChart.integrated) {
            this.sensorChart.integrated = {};
            this.sensorChart.integrated.chart = new Highcharts.Chart({

                chart: {
                    renderTo: 'sensorChart-integrated',
                    backgroundColor: 'transparent',
                    animation: false,
                    //height: 80,
                    //width: 200,
                    //  spacing: [7, 7, 7, 7]
                },

                title: {
                    text: '',
                },



                yAxis: [

                    {
                        id: 'temperature-axis',

                        title: {
                            text: 'Temperature',
                            style: {
                                color: 'yellow'
                            }
                        },

                        min: (function (antUI) {
                            var TemperatureVM = antUI.viewModel.TemperatureVM;

                            if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.CELCIUS)
                                return -20;
                            else if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT)
                                return -4;
                            else
                                return -20;

                        })(antUI),

                        //max: (function () {
                        //    if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.CELCIUS)
                        //        return 60;
                        //    else if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT)
                        //        return 140;
                        //    else
                        //        return 60;

                        //})(),

                        gridLineWidth: 0,

                        showEmpty: false,

                        tooltip: {
                            enabled: false
                        },

                        labels:
                        {
                            enabled: true,
                            style: {
                                //color: '#6D869F',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }
                        }




                    },

                    {
                        id: 'heartrate-axis',
                        title: {
                            text: 'Heart rate',
                            style: {
                                color: 'red'
                            }
                        },

                        min: 0,
                        //max: 255,

                        gridLineWidth: 0,

                        //tickPositions: [],

                        //startOnTick: false,

                        // endOnTick: false,

                        showEmpty: false,

                        // Does not disable tooltip generation (series.tooltips) -> set  enableMouseTracking = false in invd. series options
                        tooltip: {
                            enabled: false
                        },

                        labels:
                        {
                            enabled: true,
                            style: {
                                //color: '#6D869F',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }
                        }

                    },

                     {
                         id: 'footpod-speed-axis',
                         title: {
                             text: 'Footpod speed',
                             style: {
                                 color: 'green'
                             }
                         },

                         min: 0,
                         //max: 255,

                         gridLineWidth: 0,

                         //tickPositions: [],

                         //startOnTick: false,

                         // endOnTick: false,

                         showEmpty: false,

                         // Does not disable tooltip generation (series.tooltips) -> enableMouseTracking = false
                         tooltip: {
                             enabled: false
                         },

                         opposite: true,

                         labels:
                        {
                            enabled: true,
                            style: {
                                //color: '#6D869F',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }
                        }


                     },

                     {
                         id: 'bike-speed-axis',
                         title: {
                             text: 'Speed',
                             style: {
                                 color: 'blue'
                             }
                         },

                         min: 0,
                         //max: 255,

                         gridLineWidth: 0,

                         //tickPositions: [],

                         //startOnTick: false,

                         // endOnTick: false,

                         showEmpty: false,

                         // Does not disable tooltip generation (series.tooltips) -> must use enableMouseTracking = false
                         tooltip: {
                             enabled: false
                         },

                         opposite: true,

                         labels:
                        {
                            enabled: true,
                            style: {
                                //color: '#6D869F',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }
                        }


                     },

                     {
                         id: 'bike-cadence-axis',
                         title: {
                             text: 'Cadence',
                             style: {
                                 color: 'magenta'
                             }
                         },

                         min: 0,
                         //max: 255,

                         gridLineWidth: 0,

                         //tickPositions: [],

                         //startOnTick: false,

                         // endOnTick: false,

                         showEmpty: false,

                         // Does not disable tooltip generation (series.tooltips) -> must use enableMouseTracking = false
                         tooltip: {
                             enabled: false
                         },

                         opposite: true,

                         labels:
                        {
                            enabled: true,
                            style: {
                                //color: '#6D869F',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }
                        }


                     },

                      {
                          id: 'hrm-rr-axis',
                          title: {
                              text: 'RR',
                              style: {
                                  color: 'gray'
                              }
                          },

                          min: 0,
                          //max: 255,

                          gridLineWidth: 0,

                          //tickPositions: [],

                          //startOnTick: false,

                          // endOnTick: false,

                          showEmpty: false,

                          // Does not disable tooltip generation (series.tooltips) -> must use enableMouseTracking = false
                          tooltip: {
                              enabled: false
                          },

                          opposite: true,

                          labels:
                         {
                             enabled: true,
                             style: {
                                 //color: '#6D869F',
                                 fontWeight: 'bold',
                                 fontSize: '14px'
                             }
                         }


                      }


                ],

                xAxis: [{

                    id: 'datetime-axis',



                    type: 'datetime',

                    // Turn off X-axis line
                    //lineWidth: 0,

                    // Turn off tick-marks
                    //tickLength: 0,

                    //tickPositions: [],

                    labels:
                        {
                            enabled: true,
                            style: {
                                //color: '#6D869F',
                                fontWeight: 'bold',
                                fontSize: '14px',

                            },
                            y: 18
                        },

                },

                //{

                //    id: 'category-axis',



                //    type: 'category',

                //    categories : [],

                //    // Turn off X-axis line
                //    lineWidth: 0,

                //    // Turn off tick-marks
                //    //tickLength: 0,

                //    //tickPositions: [],

                //    //labels:
                //    //    {
                //    //        enabled: true,
                //    //        style: {
                //    //            //color: '#6D869F',
                //    //            fontWeight: 'bold',
                //    //            fontSize: '14px',

                //    //        },
                //    //        y: 18
                //    //    },

                //    visible : false

                //}
                ],

                series: []




            });
        }
    };

    ANTMonitorUI.prototype.addTemperatureSeries = function (page) {

        var addedSeries,
            rootVM = this.viewModel.rootVM,
            TemperatureVM = this.viewModel.TemperatureVM,
            deviceTypeVM,
            sensorId = page.broadcast.channelId.sensorId,
            handlerLogger = rootVM.sensorVM.getLogger();

        addedSeries = this.sensorChart.integrated.chart.addSeries(
            {
                name: 'Temperature ' + sensorId,
                id: 'temperature-current-' + sensorId,
                color: 'yellow',
                data: [], // tuples [timestamp,value]
                type: 'spline',

                //marker : {
                //    enabled : true,
                //    radius : 2
                //},

                yAxis: 0,

                tooltip: {
                    valueDecimals: 2,
                    valueSuffix: ' °'
                }
            }, false, false);

        deviceTypeVM = new TemperatureVM({
            logger: handlerLogger,
            temperatureMode: rootVM.settingVM.temperatureMode,
            sensorId: sensorId
        });

        this.viewModel.sensorDictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        rootVM.sensorVM.measurement.push(deviceTypeVM);


        if (page.currentTemp !== undefined) {

            if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT) {
                addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, this.tempConverter.fromCelciusToFahrenheit(page.currentTemp)], true, false, false);

            }
            else {

                addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.currentTemp], true, false, false);


            }


        }
    };

    ANTMonitorUI.prototype.addHRMSeries = function (page) {

        var addedSeries,
           rootVM = this.viewModel.rootVM,
           HRMVM = this.viewModel.HRMVM,
           deviceTypeVM,
           sensorId = page.broadcast.channelId.sensorId,
           handlerLogger = rootVM.sensorVM.getLogger();

        addedSeries = this.sensorChart.integrated.chart.addSeries(
          {
              name: 'Heartrate ' + sensorId,
              id: 'heartrate-current-' + sensorId,
              color: 'red',
              data: [], // tuples [timestamp,value]
              type: 'spline',

              marker: {
                  enabled: false
                  // radius : 2
              },

              yAxis: 1,

              tooltip: {
                  enabled: false
              },

              //tooltip: {
              //    valueDecimals: 0,
              //    valueSuffix: ' bpm'
              //},

              // Disable generation of tooltip data for mouse tracking - improve performance

              enableMouseTracking: false

          }, false, false);

        deviceTypeVM = new HRMVM({
            logger: handlerLogger,
            sensorId: sensorId
        });

        this.viewModel.sensorDictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        rootVM.sensorVM.measurement.push(deviceTypeVM);


        if (page.computedHeartRate !== undefined && page.computedHeartRate !== HRMVM.prototype.INVALID_HR) {


            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.computedHeartRate], false, false, false);

        }

        // RR

        addedSeries = this.sensorChart.integrated.chart.addSeries(
          {
              name: 'RR ' + sensorId,
              id: 'rr-' + sensorId,
              color: 'gray',
              data: [], // tuples [timestamp,value]
              type: 'spline',

              marker: {
                  enabled: false
                  // radius : 2
              },

              yAxis: 5,
              xAxis: 0,

              tooltip: {
                  enabled: false
              },

              //tooltip: {
              //    valueDecimals: 0,
              //    valueSuffix: ' bpm'
              //},

              // Disable generation of tooltip data for mouse tracking - improve performance

              enableMouseTracking: false,

              visible: false,

          }, false, false);

        this.processRR();

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.addSPDCADSeries = function (page) {

        var addedSeries,
           rootVM = this.viewModel.rootVM,
           SPDCADVM = this.viewModel.SPDCADVM,
             deviceTypeVM,
           sensorId = page.broadcast.channelId.sensorId,
            handlerLogger = rootVM.sensorVM.getLogger();

        addedSeries = this.sensorChart.integrated.chart.addSeries(
           {
               name: 'Cadence ' + sensorId,
               id: 'spdcad-cadence-' + sensorId,
               color: 'magenta',
               data: [], // tuples [timestamp,value]
               type: 'spline',

               marker: {
                   enabled: false
                   // radius : 2
               },

               yAxis: 4,

               tooltip: {
                   enabled: false
               },

               //tooltip: {
               //    valueDecimals: 0,
               //    valueSuffix: ' bpm'
               //},

               // Disable generation of tooltip data for mouse tracking - improve performance

               enableMouseTracking: false

           }, false, false);

        deviceTypeVM = new SPDCADVM({
            logger: handlerLogger,
            sensorId: sensorId
        });

        this.viewModel.sensorDictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        rootVM.sensorVM.measurement.push(deviceTypeVM);

        if (page.cadence !== undefined) {

            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.cadence], false, false, false);
        }

        addedSeries = this.sensorChart.integrated.chart.addSeries(
           {
               name: 'Speed ' + sensorId,
               id: 'spdcad-speed-' + sensorId,
               color: 'blue',
               data: [], // tuples [timestamp,value]
               type: 'spline',

               marker: {
                   enabled: false
                   // radius : 2
               },

               yAxis: 3,

               tooltip: {
                   enabled: false
               },

               //tooltip: {
               //    valueDecimals: 0,
               //    valueSuffix: ' bpm'
               //},

               // Disable generation of tooltip data for mouse tracking - improve performance

               enableMouseTracking: false

           }, false, false);

        if (page.unCalibratedSpeed !== undefined) {

            // Converted speed taking wheel circumference into account
            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, deviceTypeVM.speed()], false, false, false);

        }

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.addFootpodSeries = function (page) {

        var addedSeries,
         rootVM = this.viewModel.rootVM,
         FootpodVM = this.viewModel.FootpodVM,
         deviceTypeVM,
         sensorId = page.broadcast.channelId.sensorId,
         handlerLogger = rootVM.sensorVM.getLogger();

        addedSeries = this.sensorChart.integrated.chart.addSeries(
           {
               name: 'Footpod ' + sensorId,
               id: 'footpod-speed-' + sensorId,
               color: 'green',
               data: [], // tuples [timestamp,value]
               type: 'spline',

               marker: {
                   enabled: false
                   // radius : 2
               },

               yAxis: 2, // Footpod

               tooltip: {
                   enabled: false
               },

               //tooltip: {
               //    valueDecimals: 0,
               //    valueSuffix: ' bpm'
               //},

               // Disable generation of tooltip data for mouse tracking - improve performance

               enableMouseTracking: false

           }, false, false);

        deviceTypeVM = new FootpodVM({
            logger: handlerLogger,
            sensorId: sensorId
        });

        this.viewModel.sensorDictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        rootVM.sensorVM.measurement.push(deviceTypeVM);

        if (page.speed !== undefined) {

            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.speed], false, false, false);

        }

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.redrawIntegratedChart = function () {
        this.sensorChart.integrated.lastRedrawTimestamp = Date.now(); // Last redraw time
        this.sensorChart.integrated.chart.redraw();
    };

    ANTMonitorUI.prototype.processRR = function (page) {

        var currentSeries,
            currentTimestamp,
            len,
            RRmeasurementNr;

        // If aggregated RR data is available process it (buffered data in deviceProfile)

        if (page.aggregatedRR) {
            currentSeries = this.sensorChart.integrated.chart.get('rr-' + sensorId);
            currentTimestamp = page.timestamp + this.timezoneOffsetInMilliseconds;
            // Start with the latest measurement and go back in time
            for (len = page.aggregatedRR.length, RRmeasurementNr = len - 1; RRmeasurementNr >= 0; RRmeasurementNr--) {
                currentSeries.addPoint([currentTimestamp, page.aggregatedRR[RRmeasurementNr]], false,
          // currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024), false);
          currentSeries.data.length >= 30, false);
                //if (this.log && this.log.logging)
                //    this.log.log('info', currentTimestamp, RRmeasurementNr, page.aggregatedRR[RRmeasurementNr]);
                currentTimestamp -= page.aggregatedRR[RRmeasurementNr];
            }
        }
    };

    ANTMonitorUI.prototype.onpage = function (page) {

        //  console.log('Knockout App got message', page,e);
        var antUI = this,
            rootVM = this.viewModel.rootVM,
            sensorId = page.broadcast.channelId.sensorId,
            deviceType = page.broadcast.channelId.deviceType,
            deviceTypeVM,
            handlerLogger = rootVM.sensorVM.getLogger(),
            currentSeries,

        // Viewmodels - alias

            TemperatureVM = this.viewModel.TemperatureVM,
            HRMVM = this.viewModel.HRMVM,
            FootpodVM = this.viewModel.FootpodVM,
            SPDCADVM = this.viewModel.SPDCADVM;

        deviceTypeVM = this.viewModel.sensorDictionary[sensorId];

        // Refresh viewmodel with new page data from sensor
        if (deviceTypeVM)
            deviceTypeVM.updateFromPage(page);

        switch (deviceType) {

            case 25:
                if (!deviceTypeVM)
                    this.addTemperatureSeries(page);
                else {
                    if (deviceTypeVM instanceof TemperatureVM && page.currentTemp !== undefined) {

                        currentSeries = this.sensorChart.integrated.chart.get('temperature-current-' + sensorId);

                        if (rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT) {
                            currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, this.tempConverter.fromCelciusToFahrenheit(page.currentTemp)]);
                        } else {
                            currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.currentTemp], false, currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024), false);
                        }

                        // Immediate redraw due to slow update frequency (1 minute)
                        this.redrawIntegratedChart();

                    }
                }

                break;

            case 120:

                if (!deviceTypeVM)
                    this.addHRMSeries(page);
                else {
                    if (deviceTypeVM instanceof HRMVM && page.computedHeartRate !== HRMVM.prototype.INVALID_HR) {
                        currentSeries = this.sensorChart.integrated.chart.get('heartrate-current-' + sensorId);
                        currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.computedHeartRate], false,
                            currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                             // currentSeries.data.length > 5,
                            false);

                        if ((Date.now() - this.sensorChart.integrated.lastRedrawTimestamp >= 1000)) {
                            this.redrawIntegratedChart();
                        }

                    }
                }

                break;

            case 121:

                if (!deviceTypeVM)
                    this.addSPDCADSeries(page);
                else {
                    if (deviceTypeVM instanceof SPDCADVM && page.cadence !== undefined) {
                        currentSeries = this.sensorChart.integrated.chart.get('spdcad-cadence-' + sensorId);
                        currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.cadence], false,
                            currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                             // currentSeries.data.length > 5,
                            false);
                    } else if (deviceTypeVM instanceof SPDCADVM && page.unCalibratedSpeed !== undefined) {
                        currentSeries = this.sensorChart.integrated.chart.get('spdcad-speed-' + sensorId);
                        currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, deviceTypeVM.speed()], false,
                            currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                             // currentSeries.data.length > 5,
                            false);
                    }

                    if ((Date.now() - this.sensorChart.integrated.lastRedrawTimestamp >= 1000)) {
                        this.redrawIntegratedChart();
                    }
                }

                break;

            case 124:

                if (!deviceTypeVM)
                    this.addFootpodSeries(page);
                else {

                    if (deviceTypeVM instanceof FootpodVM && page.speed !== undefined) {
                        currentSeries = this.sensorChart.integrated.chart.get('footpod-speed-' + sensorId);
                        currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.speed], false, currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024), false);


                    }

                    if ((Date.now() - this.sensorChart.integrated.lastRedrawTimestamp >= 1000)) {
                        this.redrawIntegratedChart();
                    }

                }

                break;

            default:

                handlerLogger.log('warn', "Device type not currently supported, cannot add series on chart for device type ", deviceType);

                break;
        }

    };

    ANTMonitorUI.prototype.startAsWindowsApp = function () {

        var app,
            activation;

        if (this.isWindowsHost()) {
            app = WinJS.Application;
            activation = Windows.ApplicationModel.Activation;
        }

        app.onresume = function () {

            this.host.init(this.host.options, this.host.options.initCB);

        }.bind(this);

        app.onactivated = function (args) {

            if (args.detail.kind === activation.ActivationKind.launch) {

                switch (args.detail.previousExecutionState) {

                    default:
                        this._startKnockout();


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

    ANTMonitorUI.prototype._initANTHost = function (onPage) {

        var USBHostModuleId,
            initUSBHost = function (ANTHost, USBHost, TEMPprofile, RxScanMode) {

                var rootVM = this.viewModel.rootVM;

                this.host = new ANTHost();

                var USBoptions = {

                    log: rootVM.settingVM.logging() || false,

                    // Requested transfer size 512 bytes - allows reading of driver buffered data

                    length: { in: 64 * 8 },

                    // Windows 8 USB: Subscribe to events from device watcher in the USB subsystem

                    deviceWatcher: {

                        onAdded: function (deviceInformation) {
                            var host = this.host;

                            rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                            // rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                            //rootVM.deviceVM.enumeratedDevice.push({ name: 'TEST USB', id: 'testid' });

                            if (deviceInformation.id === host.usb.options.deviceId) {
                                // Keep local storage synchronized (i.e deviceId was undefined during enumeration,
                                // but found among the known devices.

                                this.storage.set(this.storage.__proto__.key.defaultDeviceId, deviceInformation.id);

                                // Update selection with the specific device please, if the select drop-down is used

                                rootVM.deviceVM.selectedDevice(deviceInformation);
                            }

                        }.bind(this),

                        onRemoved: function (deviceInformation) {
                            // Remove from UI
                            rootVM.deviceVM.enumeratedDevice.remove(
                                // predicate - compares underlying array value with a condition
                                // http://knockoutjs.com/documentation/observableArrays.html #remove and removeAll
                                function (value) { return value.id === deviceInformation.id; });

                        }.bind(this.host),

                        onEnumerationCompleted: function () {

                            var host = this.host;

                            rootVM.deviceVM.enumerationCompleted(true);

                            // In case deviceId is updated, during enumeration
                            if (host.usb.options.deviceId)
                                this.storage.set(this.storage.__proto__.key.defaultDeviceId, host.usb.options.deviceId);

                            //
                            var devInfo;
                            for (var devNum = 0; devNum < rootVM.deviceVM.enumeratedDevice().length; devNum++) {
                                devInfo = rootVM.deviceVM.enumeratedDevice()[devNum];
                                if (host.usb.options.deviceId === devInfo.id) {
                                    rootVM.deviceVM.selectedDevice(devInfo);
                                    break;
                                }
                            }

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

                    }.bind(this.host);

                    var channel = new RxScanMode({
                        log: rootVM.settingVM.logging() || false,
                        channelId: {
                            deviceNumber: 0,
                            //  deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                            deviceType: 0,
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
                                this.log.log('log', 'Host environment offers device watching capability, e.g windows 8.1');

                            // console.profile('Establish channel');

                            this.establishChannel({
                                channelNumber: 0,
                                networkNumber: 0,
                                // channelPeriod will be ignored for RxScanMode channel
                                channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
                                configurationName: 'slave only',
                                channel: channel,
                                open: true
                            }, onChannelEstablished);

                        }
                    }.bind(this.host);

                    this.host.init(hostOptions, hostInitCB);
                }

            }

        if (this.isWindowsHost())
            USBHostModuleId = 'usb/USBWindows'
        else if (this.isChromeHost())
            USBHostModuleId = 'usb/USBChrome';

        if (!USBHostModuleId) {
            // Log no USB host module defined
            return;
        }

        require(['anthost', USBHostModuleId, 'profiles/environment/deviceProfile_ENVIRONMENT', 'profiles/RxScanMode'], initUSBHost.bind(this));

    };

    ANTMonitorUI.prototype.exitAndResetDevice = function (callback) {
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

    void new ANTMonitorUI();

})(); // Enclose in separate lexical environment by convention (to not interfere with the global object/environment)
