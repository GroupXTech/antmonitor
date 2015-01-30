/* global ko:true, window: true, document: true, setTimeout: true, setInterval: true, clearInterval: true, clearTimeout: true, requirejs: true, Highcharts: true */

(function _ANTmonitorUI() {

    'use strict';

    function ANTmonitorUI()
    {
        var requirejsConfiguration;

        this.hostEnvironmentReady = false;

        window.addEventListener('message', this.onmessage.bind(this));

        setTimeout(function () {
            if (!this.hostEnvironmentReady) {
                if (this.logger && this.logger.logging) {
                    this.logger.log('warn', 'Has not received ready signal from host environment');

                }
            }
        }.bind(this), 10000);


        requirejsConfiguration = {

            baseUrl: '../bower_components/libant',

            paths: {

                // Persistence

                //db: '../../scripts/db',

                vm: '../../scripts/viewmodel',

                scripts : '../../scripts',

                converter : '../../scripts/converter'

            },

        };

        requirejs.config(requirejsConfiguration);

        // Linux filenames are case sensitive -> can get resource loading problems if module id does not match filename exactly

        requirejs(['vm/sensorVM', 'vm/temperatureVM', 'vm/footpodVM', 'vm/heartRateVM', 'vm/bikeSpeedCadenceVM', 'vm/bikePowerVM', 'vm/timerVM', 'vm/settingVM', 'vm/languageVM','scripts/timer','logger'],
            function (SensorVM,TemperatureVM,FootpodVM,heartRateVM,bikeSpeedCadenceVM,BikePowerVM,TimerVM,SettingVM,LanguageVM,Timer,Logger) {


                this.logger = new Logger({ log: true, logSource : this });

                if (this.logger && this.logger.logging) {
                    this.logger.log('info','Location: ' + window.location.href);
                }

                // Keeps track of timeouts and intervals

                this.timerID = {
                    interval: {},
                    timeout: {}
                };

                // For referencing viewmodel constructors

                this.module = {
                    FootpodVM : FootpodVM,
                    TemperatureVM : TemperatureVM,
                    heartRateVM : heartRateVM,
                    bikeSpeedCadenceVM : bikeSpeedCadenceVM,
                    bikePowerVM : BikePowerVM,
                    TimerVM : TimerVM,
                    SettingVM : SettingVM,
                    LanguageVM : LanguageVM,
                    Timer : Timer,
                    Logger : Logger,
                    SensorVM : SensorVM
                };

        }.bind(this));

    }

    ANTmonitorUI.prototype.onmessage = function (event)
    {

        var sourceWindow = event.source,
            data = event.data;

       // if (this.logger && this.logger.logging)
       //     this.logger.log('info', 'Received message', event);

        if (!data)
        {
            if (this.logger && this.logger.logging) {
                this.logger.log('warn', 'No/undefined data received');
            }

            return;
        }

        switch (data.response) {

            case 'ready':

                // UI relies on that the host environment first provides a READY signal (ANT+ channel established, access to storage API),
                // before initializing the UI and setup databinding

                // Don't apply data-bindings if we already got the first 'ready' signal from host environment (lifecycle win81: during resume from suspend)
                if (this.hostEnvironmentReady)
                {
                    if (this.logger && this.logger.logging) {
                        this.logger.log('log', 'Host environment is already ready - skipped init of root viewmodel');
                    }

                    return;
                }

                this.hostEnvironmentReady = true;

                this.hostFrame = sourceWindow;

                if (this.logger && this.logger.logging) {
                    this.logger.log('log', 'Got READY signal from host environment - initializing root viewmodel');
                }

                window.parent.postMessage({ request: 'ready' }, '*');

                this.initRootVM();

                break;

            case 'clearTimers':

                this.clearTimers();

                break;

            case 'page':

                this.initViewModelForPage(data.page);

                break;

            // DB handling

            case 'get':

                // NOOP
                break;

            case 'set': // ECHO message when keys has been stored

                // NOOP

                break;

            default:

                if (this.logger && this.logger.logging) {
                    this.logger.log('error','Unable to do anything with data, unknown response from host ', data);
                }

                break;

        }

    };

    ANTmonitorUI.prototype.initRootVM = function () {

        var rootVM, // Root viewmodel, contains all the other sub-view models
            sensorChart; // Contains sensor charts - mainly the integrated chart

        this.sensorChart = {};
        sensorChart = this.sensorChart;

        // Holds knockoutjs viewmodel constructor functions and root
        this.viewModel = {};

        this.viewModel.rootVM = {

            // Holds references to the viewmodel for a particular sensor (using sensorId based on ANT channelId)
            VMdictionary : {},

            languageVM : new this.module.LanguageVM({
                logger : this.logger,
                log : true}),

            settingVM: new this.module.SettingVM({
                logger : this.logger,
                log : true,

            }),

            // Holds an array with viewmodels for the sensors that are discovered
            sensorVM: new this.module.SensorVM({
                logger : this.logger,
                log: false }),

            // Contains all enumerated devices that fullfill the USB selector
            deviceVM: {

                enumerationCompleted: ko.observable(false),

                enumeratedDevice: ko.observableArray(),

                // User selected default device id.

                selectedDevice: ko.observable(),

                //rootVM.deviceVM.selectedDevice.subscribe(function (deviceInformation) {

                //    //    var storedDefaultDeviceId;

                //    //    this.storage.get(this.storage.__proto__.key.defaultDeviceId, function (db) {
                //    //        storedDefaultDeviceId = db[this.storage.__proto__.key.defaultDeviceId];

                //    //        if (deviceInformation && (storedDefaultDeviceId !== deviceInformation.id)) {
                //    //            this.storage.set(this.storage.__proto__.key.defaultDeviceId, deviceInformation.id);
                //    //            this.exitAndResetDevice(function _initANT() {
                //    //                // Remove previous state
                //    //                rootVM.deviceVM.enumeratedDevice.removeAll();
                //    //                this._initANTHost(pageHandler);
                //    //            }.bind(this));
                //    //        }
                //    //    }.bind(this));

                //    //}.bind(this));

            },

            sensorChart: sensorChart,

        };

        rootVM = this.viewModel.rootVM;

         rootVM.timerVM = new this.module.TimerVM({
                logger : this.logger,
                log: true,
                rootVM : rootVM
               });

        // Activate main tab by simulating a click on the link

         var mouseClick = document.createEvent('MouseEvents');

        mouseClick.initEvent('click', false, false); // Only on target

        var aMain = document.getElementById('aMain');

        if (this.logger && this.logger.logging) {
            this.logger.log('info', 'Sent click event to main tab to toggle visibility of short sensor info and sensor chart', aMain,mouseClick);
        }

        void aMain.dispatchEvent(mouseClick);

        // Activate knockoutjs on our root viewmodel

        var rootElement = document.getElementById('appRootVM');

        ko.applyBindings(rootVM, rootElement);

        rootElement.style.display = "block"; // Now it's time to show bounded ui

        this.tabMain = document.getElementById('tabMain');

        this.createIntegratedChart();

    };

    ANTmonitorUI.prototype.createIntegratedChart = function () {

        var rootVM = this.viewModel.rootVM,
            antUI = this,
            integratedChart;

        this.sensorChart.integrated = {
            options: {}
        };

        integratedChart = this.sensorChart.integrated;

        this.sensorChart.integrated.chart = new Highcharts.Chart({

            chart: {
                renderTo: 'sensorChart-integrated',
                backgroundColor: 'transparent',
                animation: false,
                //alignTicks : false,
                //height: 80,
                //width: 200,
                //  spacing: [7, 7, 7, 7]
            },

            //legend: {
            //    itemWidth: 240
            //},

            title: {
                text: '',
            },

            yAxis: [

                 {
                     id: 'footpod-speed-axis',
                     title: {
                         //text: 'Footpod speed',
                         text : null,
                         style: {
                             color: 'green',
                             fontSize: '16px',
                             fontWeight: 'bold'
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
                            fontSize: '16px'
                        }
                    }

                 },

                 {
                     id: 'bike-speed-axis',
                     title: {
                         //text: this.viewModel.rootVM.languageVM.speed().message.toLocaleUpperCase(),
                         text : null,
                         style: {
                             color: 'blue',
                             fontWeight: 'bold',
                             fontSize: '16px'
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
                            color: 'blue',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }
                    }
                },

                 {
                     id: 'bike-cadence-axis',
                     title: {
                         //text: this.viewModel.rootVM.languageVM.cadence().message.toLocaleUpperCase(),
                         text :  null,
                         style: {
                             color: 'magenta',
                             fontSize: '16px',
                             fontWeight: 'bold'
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
                            color: 'magenta',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }
                    }


                 },

                {
                    id: 'bike-power-axis',
                    title: {
                        //text: this.viewModel.rootVM.languageVM.heartrate().message.toLocaleUpperCase(),
                        text : null,
                        style: {
                            color: 'orange',
                            fontSize: '16px',
                            fontWeight: 'bold'
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
                            color: 'orange',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }
                    },

                    opposite : true

                },



            ],

            xAxis: [{

                id: 'datetime-axis',

                type: 'datetime',

                // Turn off X-axis line
                //lineWidth: 0,

                // Turn off tick-marks
                //tickLength: 0,

                //tickPositions: [],

                offset : 10,

                labels:
                    {
                        enabled: true,
                        style: {
                            //color: '#6D869F',
                            fontWeight: 'bold',
                            fontSize: '16px',

                        },

                        y: 18
                    },

            }],

            series: []

        });

        this.timerID.interval.redrawIntegratedChart = setInterval(this.redrawIntegratedChart.bind(this), 1000);

    };

    ANTmonitorUI.prototype.addFootpodSeries = function (page) {

        var addedSeries,
          FootpodVM = this.viewModel.FootpodVM,
         deviceTypeVM,
         sensorId = page.broadcast.channelId.sensorId;


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
            logger: this.logger,
            sensorId: sensorId
        });

        this.viewModel.rootVM.VMdictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        if (page.speed !== undefined) {

            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.speed], false, false, false);

        }

        this.redrawIntegratedChart();

    };

    ANTmonitorUI.prototype.redrawIntegratedChart = function () {
        // Don't attempt redraw when tab is not scheduled for any layout
        // Otherwise layout will be cluttered (particularly the legend items in Highcharts) changing display to block again
        if (window.getComputedStyle(this.tabMain).getPropertyValue('display') !== 'none') {
            this.sensorChart.integrated.lastRedrawTimestamp = Date.now(); // Last redraw time
            this.sensorChart.integrated.chart.redraw();
        }
    };

    ANTmonitorUI.prototype.initViewModelForPage = function (page) {

        var rootVM = this.viewModel.rootVM,
            sensorId = page.broadcast.channelId.sensorId,
            deviceType = page.broadcast.channelId.deviceType,
            deviceTypeVM,
            Viewmodel,
            defaultOptions,
            deviceSeries;

        deviceTypeVM = rootVM.VMdictionary[sensorId];

        // Ignore initialization of viewmodel if its already created
        if (deviceTypeVM) {
         return;
        }

        defaultOptions = {

            logger: this.logger,

            page: page, // First received page

            rootVM : rootVM,
        };

        if (this.logger && this.logger.logging) {
            this.logger.log('log', 'received init/first page', page,'for sensor',sensorId);
        }

         switch (deviceType) {

            case 0x0B:

                 Viewmodel = this.module.bikePowerVM;
                 deviceSeries = rootVM.sensorVM.devices.BIKE_POWER;

                 break;

            case 25:

                 Viewmodel = this.module.TemperatureVM;
                 deviceSeries = rootVM.sensorVM.devices.ENVIRONMENT;

                break;

            case 120:

                  Viewmodel = this.module.heartRateVM;
                  deviceSeries = rootVM.sensorVM.devices.HRM;

                 break;


            case 121: // Bike Combined speed and cadence
            case 122: // Bike cadence
            case 123: // Bike speed

                 Viewmodel = this.module.bikeSpeedCadenceVM;
                 deviceSeries = rootVM.sensorVM.devices.SPDCAD;

                break;

            /* case 124:

                 Viewmodel = this.module.FootpodVM;
                 deviceSeries = rootVM.sensorVM.devices.SDM;
                break; */

            default:

                this.logger.log('warn', "Device type not currently supported, cannot add series on chart for device type ", deviceType);

                break;
        }

        if (Viewmodel) {

            this.viewModel.rootVM.VMdictionary[sensorId] = new Viewmodel(defaultOptions);

            deviceSeries.push(this.viewModel.rootVM.VMdictionary[sensorId]);

            this.redrawIntegratedChart();
        }

    };

    // Clear all timeout and intervals
    ANTmonitorUI.prototype.clearTimers = function ()
    {
        var timerName;

        if (!this.timerID) {
            return;
        }

        // Timeouts

        for (timerName in this.timerID.timeout)
        {
            clearTimeout(this.timerID.timeout[timerName]);
            if (this.logger && this.logger.logging) {
                this.logger.log('log', 'Cleared timeout ' + timerName + ' id/handle ' + this.timerID.timeout[timerName]);
            }
        }

        // Intervals

        for (timerName in this.timerID.interval) {
            clearInterval(this.timerID.interval[timerName]);
            if (this.logger && this.logger.logging) {
                this.logger.log('log', 'Cleared interval' + timerName + ' id/handle ' + this.timerID.interval[timerName]);
            }
        }

    };

    void new ANTmonitorUI();

})();
