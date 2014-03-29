/* global define: true, ko:true, window: true, document: true, setTimeout: true, setInterval: true, clearInterval: true, clearTimeout: true, requirejs: true, Highcharts: true */
(function _ANTMonitorUI() {
    'use strict';

    function HostEnvironment()
    {}

    HostEnvironment.prototype.PROTOCOL = {
        MS: 'ms-appx:',
        CHROME: 'chrome-extension:'
    };

    function ANTMonitorUI()
    {
        var requirejsConfiguration;

        this.name = 'UI frame';

        this.hostEnvironmentReady = false;

        window.addEventListener('message', this.onmessage.bind(this));

        window.parent.postMessage({ 'request' : 'ready'},'*'); // Signal that UI frame will accept messages now

        setTimeout(function () {
            if (!this.hostEnvironmentReady) {
                if (this.logger && this.logger.logging) this.logger.log('warn', this.name+' has not received ready from host environment - messages will probably not reach host');
            }
        }.bind(this), 3000);

        console.info(this.name+' location: ' + window.location.href);
        
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

        requirejs(['vm/sensorVM', 'vm/temperatureVM', 'vm/footpodVM', 'vm/HRMVM', 'vm/SPDCADVM', 'vm/timerVM', 'vm/settingVM', 'vm/languageVM','scripts/timer','logger', 'converter/temperatureConverter'],
            function (SensorVM,TemperatureVM,FootpodVM,HRMVM,SPDCADVM,TimerVM,SettingVM,LanguageVM,Timer,Logger,TempConverter) {

                this.logger = new Logger({ log: true });

                // Keeps track of timeouts and intervals
                this.timerID = {
                    interval: {},
                    timeout: {}
                };

                // For referencing viewmodel constructors
                this.module = {
                    FootpodVM : FootpodVM,
                    TemperatureVM : TemperatureVM,
                    HRMVM : HRMVM,
                    SPDCADVM : SPDCADVM,
                    TimerVM : TimerVM,
                    SettingVM : SettingVM,
                    LanguageVM : LanguageVM,
                    Timer : Timer,
                    Logger : Logger,
                    TempConverter : TempConverter,
                    SensorVM : SensorVM
                };

                 this.sendReadyEvent();

        }.bind(this));

       
    }

    ANTMonitorUI.prototype.onmessage = function (event)
    {

        var firstSetKey;

       // try {


            var sourceWindow = event.source,
                data = event.data,
                sensorId,
                vm,
                key,
                value,
                property,
                index;


            //// Skip unknown protocols if available
            //if (sourceWindow && (sourceWindow.location.protocol !== HostEnvironment.prototype.PROTOCOL.MS) && (sourceWindow.location.protocol !== HostEnvironment.prototype.PROTOCOL.CHROME)) {
            //    if (this.logger && this.logger.logging) {
            //        this.logger.log('error', 'Received message event from source with a protocol that cannot be handled');
            //        return;
            //    }

            //}

            if (this.logger && this.logger.logging) this.logger.log('info', this.name+' received message', event);

            if (!data)
            {
                if (this.logger && this.logger.logging) this.logger.log('warn', this.name + ' no data received');
                return;
            }

            switch (data.response) {

                case 'ready':

                    this.hostEnvironmentReady = true;

                    this.hostFrame = sourceWindow;

                    if (this.logger && this.logger.logging)
                        this.logger.log('log', this.name + ' ready to process messages');


                    // Only start UI, when host environment is ready (e.g must have access to storage)
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


                    break;

                case 'set': // ECHO when keys has been stored

                   /* firstSetKey = Object.keys(data.items).join('-');
                    if (firstSetKey)
                        console.timeEnd('set-' + firstSetKey);
*/
                    break;


                default:

                    if (this.logger && this.logger.logging) this.logger.log('error', this.name + ' is unable to do anything with data ', data);

                    break;

            }
           

     //   } catch (e) { // Maybe a dataclone error
     //       if (this.logger && this.logger.logging)
     //           this.logger.log('error', ' error', 'Event', event, e);
     //   }
        

    };

    ANTMonitorUI.prototype.sendReadyEvent = function () {
       
        window.parent.postMessage({ request: 'ready' },'*');
    };


    ANTMonitorUI.prototype.initRootVM = function () {

        var rootVM; // Root viewmodel, contains all the other sub-view models
        var tempModeKey;
        var sensorChart;
        

        // Holds chart instance
        this.sensorChart = {};
        sensorChart = this.sensorChart;

        // Holds knockoutjs viewmodel constructor functions and root
        this.viewModel = {};

        // Holds references to the viewmodel for a particular sensor (using sensorId based on ANT channelId)
        this.viewModel.dictionary = {};

        this.tempConverter = new this.module.TempConverter();

        this.viewModel.rootVM = {

            languageVM : new this.module.LanguageVM({log : true}),

            settingVM: new this.module.SettingVM({
                log : true,
                uiFrameWindow : window
            }),

            // Holds an array with viewmodels for the sensors that are discovered
            sensorVM: new this.module.SensorVM({ log: false }),

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



            //  ui: this, // For referencing ui.prototype functions inside viewmodel callbacks,
            // Hook up event listeners instead

            sensorChart: sensorChart,

        };

        rootVM = this.viewModel.rootVM;



         rootVM.timerVM = new this.module.TimerVM({
                log: true,
                timezoneOffsetInMilliseconds : rootVM.settingVM.timezoneOffsetInMilliseconds
            });


        rootVM.timerVM.addEventListener('stop', function (latestLocalStopTime) {
            this.addPlotLine('red', latestLocalStopTime);
        }.bind(this));

        rootVM.timerVM.addEventListener('start', function (latestLocalStartTime) {
            this.addPlotLine('green', latestLocalStartTime);
        }.bind(this));

        rootVM.timerVM.addEventListener('lap', function (localLapTime) {
            this.addPlotLine('gray', localLapTime);
        }.bind(this));


        rootVM.timerVM.addEventListener('firststart', function () {
            this._resetViewModels();
        }.bind(this));

        rootVM.timerVM.addEventListener('reset', function () {
            var viewModel = this.viewModel.rootVM,
                chart,
                dateTimeAxis,
                seriesNr,
                currentSeries,
                len;

            if (viewModel.sensorChart && viewModel.sensorChart.integrated) {


                chart = viewModel.sensorChart.integrated.chart;

                // Remove plot lines

                dateTimeAxis = chart.get('datetime-axis');

                if (dateTimeAxis) {

                    dateTimeAxis.removePlotLine(); // undefined id will delete all plotlines (using id === undefined)

                }

                // Remove series data

                for (seriesNr = 0, len = chart.series.length; seriesNr < len; seriesNr++) {

                    currentSeries = chart.series[seriesNr];

                    currentSeries.setData([], false);
                }


                this._resetViewModels();


            }
        }.bind(this));



        //tempModeKey = this.storage.__proto__.key.temperaturemode;

        //this.storage.get(tempModeKey, function _fetchTemperatureMode(db) {

        //    var show24hMaxMinKey = this.storage.__proto__.key.show24hMaxMin;

        //    rootVM.settingVM.temperatureMode = ko.observable(db[tempModeKey] || TemperatureVM.prototype.MODE.CELCIUS);

        //    this.storage.get(show24hMaxMinKey, function _fetchShow24hMaxMin(db) {

        //        rootVM.settingVM.show24HMaxMin = ko.observable(db[show24hMaxMinKey] === "true" || false);

        //        this.configureKnockout();

        //    }.bind(this));

        //}.bind(this));

        // Activate main tab by simulating a click on the link

        var mouseClick = document.createEvent('MouseEvents');
        mouseClick.initEvent('click', false, false); // Only on target

        var aMain = document.getElementById('aMain');
        if (this.logger && this.logger.logging)
            this.logger.log('info', 'Sent click event to main tab to toggle visibility of short sensor info and sensor chart', aMain,mouseClick);
        void aMain.dispatchEvent(mouseClick);

        // Activate knockoutjs on our root viewmodel

        var rootElement = document.getElementById('appRootVM');

        ko.applyBindings(rootVM, rootElement);

        rootElement.style.display = "block"; // Now it's time to show bounded ui

        this.tabMain = document.getElementById('tabMain');

        this.createIntegratedChart();

    };

    // Reset sensor viewmodels
    ANTMonitorUI.prototype._resetViewModels = function () {
      
        var sensorDictionary = this.viewModel.dictionary;

        for (var sensorId in sensorDictionary) {
            if (typeof sensorDictionary[sensorId].reset === 'function')
                sensorDictionary[sensorId].reset();

        }
    };

    ANTMonitorUI.prototype.addPlotLine = function (color, time)
    {
        var chart,
            dateTimeAxis,
            id,
            sensorChart = this.sensorChart;

        if (sensorChart && sensorChart.integrated) {
            chart = sensorChart.integrated.chart;

            dateTimeAxis = chart.get('datetime-axis');
            if (dateTimeAxis) {
                //id = 'plotline-' + rootVM.settingVM.tracking.plotLines.length
                dateTimeAxis.addPlotLine({
                    // id: id,
                    color: color,
                    dashStyle: 'dash',
                    width: 1,
                    value: time
                });

                //   rootVM.settingVM.tracking.plotLines.push(id);

            }
        }
    };

    ANTMonitorUI.prototype.createIntegratedChart = function () {

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
                    id: 'temperature-axis',

                    title: {
                        //text: this.viewModel.rootVM.languageVM.temperature().message.toLocaleUpperCase(),
                        text : null,
                        style: {
                            color: 'black',
                            fontSize: '16px',
                            fontWeight : 'bold'
                        }
                    },

                    min: (function (antUI) {
                        var TemperatureVM = antUI.module.TemperatureVM;

                        if (rootVM.settingVM.temperatureMode && rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.CELCIUS)
                            return -20;
                        else if (rootVM.settingVM.temperatureMode && rootVM.settingVM.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT)
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
                            color: 'black',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }
                    }

                },

                {
                    id: 'heartrate-axis',
                    title: {
                        //text: this.viewModel.rootVM.languageVM.heartrate().message.toLocaleUpperCase(),
                        text : null,
                        style: {
                            color: 'red',
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
                            color: 'red',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }
                    },

                    opposite : true

                },

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
                      id: 'hrm-rr-axis',
                      title: {
                          //text: 'RR',
                          text : null,
                          style: {
                              color: 'gray',
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

                      //opposite: true,

                      labels:
                     {
                         enabled: true,
                         style: {
                             color: 'gray',
                             fontWeight: 'bold',
                             fontSize: '16px'
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
                            fontSize: '16px',

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
            //    //            fontSize: '16px',

            //    //        },
            //    //        y: 18
            //    //    },

            //    visible : false

            //}
            ],

            series: []




        });

        this.startRedrawInterval(1000);



    };


    ANTMonitorUI.prototype.initTemperatureSeries = function (page) {

        var rootVM = this.viewModel.rootVM,
            deviceTypeVM,
            sensorId = page.broadcast.channelId.sensorId,
            handlerLogger = this.logger;

        deviceTypeVM = new this.module.TemperatureVM({

            logger: handlerLogger,

            //temperatureMode: rootVM.settingVM.temperatureMode,

            page: page,

            uiFrameWindow : window,

            rootVM : rootVM,

            chart : this.sensorChart.integrated.chart,

            temperatureConverter : this.tempConverter, // Share code

        });

        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        rootVM.sensorVM.devices.ENVIRONMENT.push(deviceTypeVM);

        this.redrawIntegratedChart();
    };

    ANTMonitorUI.prototype.initHRMSeries = function (page) {

        var  deviceTypeVM,
           sensorId = page.broadcast.channelId.sensorId,
           handlerLogger = this.logger;

        deviceTypeVM = new this.module.HRMVM({

            logger: handlerLogger,

            page: page,

            uiFrameWindow : window,

            rootVM : this.viewModel.rootVM,

            chart : this.sensorChart.integrated.chart,
        });

        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        this.viewModel.rootVM.sensorVM.devices.HRM.push(deviceTypeVM);

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.initSPDCADSeries = function (page) {

        var addedSeries,
           rootVM = this.viewModel.rootVM,
           SPDCADVM = this.module.SPDCADVM,
             deviceTypeVM,
           sensorId = page.broadcast.channelId.sensorId,
            handlerLogger = this.logger;


        deviceTypeVM = new this.module.SPDCADVM({

            logger: handlerLogger,

            page: page,

            uiFrameWindow : window,

            rootVM : this.viewModel.rootVM,

            chart : this.sensorChart.integrated.chart,

        });

        deviceTypeVM.addEventListener('newRelativeDistance', function (observable, relativeDistance) {
            var timer = this.viewModel.rootVM.timerVM._timer;
            if (timer.state === timer.__proto__.STATE.STARTED) // Only update cumulatated distance  when timer is running
                observable(observable()+relativeDistance);
        }.bind(this));


        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        rootVM.sensorVM.devices.SPDCAD.push(deviceTypeVM);

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.addFootpodSeries = function (page) {

        var addedSeries,
         rootVM = this.viewModel.rootVM,
         FootpodVM = this.viewModel.FootpodVM,
         deviceTypeVM,
         sensorId = page.broadcast.channelId.sensorId,
         handlerLogger = this.logger;

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

        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        if (page.speed !== undefined) {

            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.speed], false, false, false);

        }

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.redrawIntegratedChart = function () {
        // Don't attempt redraw when tab is not scheduled for any layout
        // Otherwise layout will be cluttered (particularly the legend items in Highcharts) changing display to block again
        if (window.getComputedStyle(this.tabMain).getPropertyValue('display') !== 'none') {
            this.sensorChart.integrated.lastRedrawTimestamp = Date.now(); // Last redraw time
            this.sensorChart.integrated.chart.redraw();
        }
    };



    ANTMonitorUI.prototype.initViewModelForPage = function (page) {

        var antUI = this,
            rootVM = this.viewModel.rootVM,
            sensorId = page.broadcast.channelId.sensorId,
            deviceType = page.broadcast.channelId.deviceType,
            deviceTypeVM,
            handlerLogger = this.logger,
            currentSeries;


        deviceTypeVM = this.viewModel.dictionary[sensorId];

        // Ignore initialization of viewmodel if its already created

        if (deviceTypeVM)
            return;

            if (this.logger && this.logger.logging)
                this.logger.log('log', this.name + ' received init/first page', page,'for sensor',sensorId);

             switch (deviceType) {

                case 25:

                     this.initTemperatureSeries(page);

                    break;

                case 120:

                     this.initHRMSeries(page);

                    break;

                case 121:

                     this.initSPDCADSeries(page);

                    break;

                //case 124:

                //    if (!deviceTypeVM)
                //        this.addFootpodSeries(page);
                //    else {

                //        if (deviceTypeVM instanceof FootpodVM && page.speed !== undefined) {
                //            currentSeries = this.sensorChart.integrated.chart.get('footpod-speed-' + sensorId);
                //            currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.speed], false,
                //                //currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                //                false,
                //                false);


                //        }

                //        //if ((Date.now() - this.sensorChart.integrated.lastRedrawTimestamp >= 1000)) {
                //        //    this.redrawIntegratedChart();
                //        //}

                //    }

                //    break;

                default:

                    handlerLogger.log('warn', "Device type not currently supported, cannot add series on chart for device type ", deviceType);

                    break;
            }


    };

    ANTMonitorUI.prototype.startRedrawInterval = function (delay) {
        var redrawHandler = function () {

            var serieNr;

            if (!this.sensorChart)
                return;

            if (window.getComputedStyle(this.tabMain).getPropertyValue('display') === 'none')
            {
               
                return;
            }

            for (serieNr = 0; serieNr < this.sensorChart.integrated.chart.series.length; serieNr++) {

                if (this.sensorChart.integrated.chart.series[serieNr].isDirty && this.sensorChart.integrated.chart.series[serieNr].isDirtyData) {
                    this.redrawIntegratedChart();
                    break;
                }
            }
        }.bind(this);

        // to do: maybe use array instead? clearInterval on suspend/shutdown?
        this.timerID.interval.redrawIntegratedChart = setInterval(redrawHandler, delay);

    };

    // Clear all timeout and intervals
    ANTMonitorUI.prototype.clearTimers = function ()
    {
        var timerName;

        if (!this.timerID)
            return;

        // Timeouts

        for (timerName in this.timerID.timeout)
        {
            clearTimeout(this.timerID.timeout[timerName]);
            if (this.logger && this.logger.logging)
                this.logger.log('log', 'Cleared timeout ' + timerName + ' id/handle ' + this.timerID.timeout[timerName]);
            
        }

        // Intervals

        for (timerName in this.timerID.interval) {
            clearInterval(this.timerID.interval[timerName]);
            if (this.logger && this.logger.logging)
                this.logger.log('log', 'Cleared interval' + timerName + ' id/handle ' + this.timerID.interval[timerName]);
        }


        
    };

    void new ANTMonitorUI();

})();
