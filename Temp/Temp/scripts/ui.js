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

                this.initRootVM();

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

            if (this.logger && this.logger.logging) this.logger.log('info', this.name+' received message event', event);

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

                    break;

                case 'clearTimers':

                    this.clearTimers();

                    break;

                case 'page':

                    this.initViewModelForPage(data.page);

                    break;

                    // DB handling

                case 'get':

                    console.info('UI got a get!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

                    // Sensor specific : Properties are stored in the format; property-sensorid = value
                    // Setting : setting-settingname = value
                    
                   /* if (typeof data.items === 'object') {

                        for (key in data.items)
                        {

                            console.timeEnd('get-' + key);
                            index = key.indexOf('-', 0);
                            
                            property = key.substr(0, index);
                             sensorId = key.substring(index + 1);

                            if (property === 'setting') {
                                vm = this.viewModel.rootVM.settingVM;

                            }
                                else {

                                    vm = this.viewModel.dictionary[sensorId]; // get viewmodel
                                }

                            if (vm)
                            {
                                value = data.items[key];
                                if (value)  // Don't update with undefined
                                    vm[property](value);

                            } else
                            {
                                if (this._logger && this._logger.logging) this._logger.log('warn', 'Received data from storage for key ' + key + ', but viewmodel is not available');
                            }

                            // Startswith common in Ecmascript 6?
                            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith

                        }
                    } else
                    {
                        if (this._logger && this._logger.logging) this._logger.log('warn', 'Unable to process items, expected an object',data.items);
                    }*/

                    break;

                case 'set': // ECHO when keys has been stored

                    firstSetKey = Object.keys(data.items).join('-');
                    if (firstSetKey)
                        console.timeEnd('set-' + firstSetKey);

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

            settingVM: new this.module.SettingVM({log : true}),

            // Holds an array on viewmodels for the sensors that are discovered
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

        // Get default x-Axis formatter;

        var xAxis = this.sensorChart.integrated.chart.get('datetime-axis');

        this.sensorChart.integrated.options.defaultxAxisLabelFormatter = xAxis.labelFormatter; // Keep reference to avoid possible garbage collection of formatter

        

        
        this.sensorChart.integrated.options.liveTrackingxAxisLabelFormatter = function _liveTrackingxAxisLabelFormatter(tickConfiguration) {

            var offset = this.timezoneOffsetInMilliseconds,
                value = tickConfiguration.value - offset, // UTC
                newTickLabel,
                startTime,
                stopTime,
                segment,
                len,
                segmentElapsedTime = 0,
                firstSegmentStartTime,
                lastSegmentStopTime,
                defaultFormatter = integratedChart.options.defaultxAxisLabelFormatter;

            // Timer not running or not available - use default

            if (!this.timer || (this.timer.state === this.timer.__proto__.STATE.INIT))
                return defaultFormatter.call(tickConfiguration); // Highcharts.Axis.prototype.defaultLabelFormatter

         
                if (this.logger && this.logger.logging)
                    this.logger.log('info', 'Tick positions local time', tickConfiguration.axis.tickPositions);

                this.sensorChart.integrated.elapsedTime = 0;

                firstSegmentStartTime = this.timer.startTime[0];
                lastSegmentStopTime = this.timer.stopTime[this.timer.stopTime.length - 1];


                //if (value < firstSegmentStartTime || value > lastSegmentStopTime)
                //    return defaultFormatter.call(tickConfiguration);


                for (segment = 0, len = this.timer.startTime.length; segment < len; segment++) {

                    startTime = this.timer.startTime[segment];
                    stopTime = this.timer.stopTime[segment];

                    if (value >= startTime && (stopTime === undefined))
                        return "Inside";

                    if (this.logger && this.logger.logging)
                        this.logger.log('info', 'Segment', segment, 'elapsed time', this.sensorChart.integrated.elapsedTime, 'segment elapsed time', segmentElapsedTime,'starttime',startTime,'value',value,'stoptime',stopTime);

                }
         

              
            //    // Tick is before first segment and after the last segment

            //    if (value < startTime && segment === 0 || segment === len-1 && value > stopTime)
            //    {
            //        //newTickLabel = integratedChart.options.defaultxAxisLabelFormatter.call(tickConfiguration);
            //       // newTickLabel = undefined;
            //        break;
            //    } 

            //    // Tick is associated with segment where the timer is running - the last segment - [startTime,undefined]

            //    else if (value >= startTime && stopTime === undefined) { 
            //        newTickLabel = rootVM.timerVM.timeFormatter.format(this.sensorChart.integrated.elapsedTime + value - startTime);
            //        break;

            //        }  
                
            //    // Tick is associated with a particular segment n [startTime,stopTime]

            //    else if (value >= startTime && value <= stopTime)  
            //    {
            //        segmentElapsedTime = stopTime - startTime;

            //        newTickLabel = rootVM.timerVM.timeFormatter.format(this.sensorChart.integrated.elapsedTime + value - startTime);

            //        this.sensorChart.integrated.elapsedTime += segmentElapsedTime;

                 

            //       break;

            //    }

               

            //}

            //return newTickLabel;

        }.bind(this);

        // highcharts call this function with a this object literal and sends no arguments -> antUI closure variable used instead  to keep a reference to our this

       
        this.sensorChart.integrated.options.liveTrackingxAxisLabelFormatterWrapper = function _liveTrackingxAxisLabelFormatterWrapper()
        {
           return antUI.sensorChart.integrated.options.liveTrackingxAxisLabelFormatter.call(antUI,this);
        };

        // Override default formatter with our new live tracking formatter
        xAxis.labelFormatter = this.sensorChart.integrated.options.liveTrackingxAxisLabelFormatterWrapper;

        this.startRedrawInterval(1000);

        this.sendReadyEvent();

        // TEST change formatter on x-Axis 
        // setInterval(function () {
        //    integratedChart.options.liveTracking = !integratedChart.options.liveTracking;
        //}, 5000);

    };

    // Subscribe to changes in viewmodel and send a request message for storage
    ANTMonitorUI.prototype.subscribeAndStore = function (vm,properties,sensorId)
    {
       
        var subscribe = function (singleProperty) {

            vm[singleProperty].subscribe(function (newValue) {
                var key,
                   items = {};


                key = singleProperty;
                if (sensorId)
                    key += ('-' + sensorId);

                items[key] = newValue;

                window.parent.postMessage({
                    request: 'set',
                    items: items
                },'*');

            }.bind(this));
        }.bind(this);

        if (typeof properties === 'string') { // Single property
          
            subscribe(properties);
        }
        else if (Array.isArray(properties)) // Multiple properties [p1,p2,...]
        {
            for (var prop in properties)
            {
              
                subscribe(properties[prop]);
            }
        } else
        {
            if (this.logger && this.logger.logging)
                this.logger.log('warn', 'Unable to subscribe to properties of type', typeof properties);
        }
        
    };

    ANTMonitorUI.prototype.initTemperatureSeries = function (page) {

        var rootVM = this.viewModel.rootVM,
            deviceTypeVM,
            sensorId = page.broadcast.channelId.sensorId,
            handlerLogger = rootVM.sensorVM.getLogger();

        deviceTypeVM = new this.module.TemperatureVM({

            logger: handlerLogger,

            temperatureMode: rootVM.settingVM.temperatureMode,

            page: page,

            // Allow possibility for listening to message events directed to ui frame window inside viewmodel -> gives oppotunities for

            uiFrameWindow : window,

            rootVM : rootVM,

            chart : this.sensorChart.integrated.chart,

            temperatureConverter : this.tempConverter, // Share code

        });

        // In case user changes location, copy to storage

        setTimeout(function () {
            this.subscribeAndStore(deviceTypeVM, 'location',sensorId);
        }.bind(this), 500); // Wait 500ms before hooking up -> give a chance to update location on initialization without overwrite again

        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        rootVM.sensorVM.devices.ENVIRONMENT.push(deviceTypeVM);

        this.redrawIntegratedChart();
    };

    ANTMonitorUI.prototype.initHRMSeries = function (page) {

        var addedSeries,
           rootVM = this.viewModel.rootVM,
           HRMVM = this.module.HRMVM,
           deviceTypeVM,
           sensorId = page.broadcast.channelId.sensorId,
           handlerLogger = rootVM.sensorVM.getLogger();


        deviceTypeVM = new HRMVM({
            logger: handlerLogger,
            // sensorId: sensorId,
             page: page,

            uiFrameWindow : window,

            rootVM : rootVM,

            chart : this.sensorChart.integrated.chart,
        });

        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        rootVM.sensorVM.devices.HRM.push(deviceTypeVM);

        deviceTypeVM.updateFromPage(page);

        if (page.computedHeartRate !== undefined && page.computedHeartRate !== HRMVM.prototype.INVALID_HR) {


            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.computedHeartRate], false, false, false);

        }

        this.redrawIntegratedChart();

    };

    ANTMonitorUI.prototype.addSPDCADSeries = function (page) {

        var addedSeries,
           rootVM = this.viewModel.rootVM,
           SPDCADVM = this.module.SPDCADVM,
             deviceTypeVM,
           sensorId = page.broadcast.channelId.sensorId,
            handlerLogger = rootVM.sensorVM.getLogger();

        addedSeries = this.sensorChart.integrated.chart.addSeries(
           {
               name: this.viewModel.rootVM.languageVM.cadence().message+' ' + sensorId,
               id: 'SPDCAD-cadence-' + sensorId,
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

               enableMouseTracking: false,

               visible : false // Turn of cadence, often just having speed available is the most relevant

           }, false, false);

        window.parent.postMessage({ request: 'get', items: ['wheelCircumference-' + sensorId,'speedMode-'+sensorId] },'*'); // Fetch previous wheel circumference and speed mode

        deviceTypeVM = new SPDCADVM({
            logger: handlerLogger,
            sensorId: sensorId
        });

        deviceTypeVM.addEventListener('newRelativeDistance', function (observable, relativeDistance) {
            var timer = this.viewModel.rootVM.timerVM._timer;
            if (timer.state === timer.__proto__.STATE.STARTED) // Only update cumulatated distance  when timer is running
                observable(observable()+relativeDistance);
        }.bind(this));

        // Any changes to viewmodel properies will be propagated back to storage

        setTimeout(function () {
            this.subscribeAndStore(deviceTypeVM, ['wheelCircumference','speedMode'],sensorId);
        }.bind(this), 500);

        this.viewModel.dictionary[sensorId] = deviceTypeVM;

        deviceTypeVM.updateFromPage(page);

        rootVM.sensorVM.devices.SPDCAD.push(deviceTypeVM);

        if (page.cadence !== undefined) {

            addedSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.cadence], false, false, false);
        }

        addedSeries = this.sensorChart.integrated.chart.addSeries(
           {
               name: this.viewModel.rootVM.languageVM.speed().message+' ' + sensorId,
               id: 'SPDCAD-speed-' + sensorId,
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

    ANTMonitorUI.prototype.processRR = function (page) {

        var currentSeries,
            currentTimestamp,
            len,
            RRmeasurementNr,
            sensorId = page.broadcast.channelId.sensorId,
            shiftSeries = false;

        // If aggregated RR data is available process it (buffered data in deviceProfile)

        if (page.aggregatedRR) {
            currentSeries = this.sensorChart.integrated.chart.get('RR-' + sensorId);
            currentTimestamp = page.timestamp + this.timezoneOffsetInMilliseconds;
            // Start with the latest measurement and go back in time
            for (len = page.aggregatedRR.length, RRmeasurementNr = len - 1; RRmeasurementNr >= 0; RRmeasurementNr--) {
                currentSeries.addPoint([currentTimestamp, page.aggregatedRR[RRmeasurementNr]], false,
          // currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024), false);
          //currentSeries.data.length >= 30, false);
          shiftSeries, false);
                //if (this.log && this.log.logging)
                //    this.log.log('info', currentTimestamp, RRmeasurementNr, page.aggregatedRR[RRmeasurementNr]);
                currentTimestamp -= page.aggregatedRR[RRmeasurementNr];
            }
        }
    };

    ANTMonitorUI.prototype.initViewModelForPage = function (page) {

        var antUI = this,
            rootVM = this.viewModel.rootVM,
            sensorId = page.broadcast.channelId.sensorId,
            deviceType = page.broadcast.channelId.deviceType,
            deviceTypeVM,
            handlerLogger = rootVM.sensorVM.getLogger(),
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

                   /* if (!deviceTypeVM)
                        this.addHRMSeries(page);
                    else {
                        if (deviceTypeVM instanceof HRMVM && page.computedHeartRate !== HRMVM.prototype.INVALID_HR) {
                            currentSeries = this.sensorChart.integrated.chart.get('HRM-current-' + sensorId);
                            currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.computedHeartRate], false,
                                //currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                                 // currentSeries.data.length > 5,
                                 false,
                                false);

                            this.processRR(page);

                            // Maybe: use a setInterval redraw that loops all series and check for the first series that has series.isDirty && series.isDirtyData === true -> redraw
                            //if ((Date.now() - this.sensorChart.integrated.lastRedrawTimestamp >= 1000)) {
                            //    this.redrawIntegratedChart();
                            //}

                        }
                    }*/

                    break;

                case 121:

                    if (!deviceTypeVM)
                        this.addSPDCADSeries(page);
                    else {
                        if (deviceTypeVM instanceof SPDCADVM && page.cadence !== undefined) {
                            currentSeries = this.sensorChart.integrated.chart.get('SPDCAD-cadence-' + sensorId);
                            currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, page.cadence], false,
                                //currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                                 // currentSeries.data.length > 5,
                                 false,
                                false);
                        } else if (deviceTypeVM instanceof SPDCADVM && page.unCalibratedSpeed !== undefined) {
                            currentSeries = this.sensorChart.integrated.chart.get('SPDCAD-speed-' + sensorId);
                            currentSeries.addPoint([page.timestamp + this.timezoneOffsetInMilliseconds, deviceTypeVM.speed()], false,
                                //currentSeries.data.length >= (currentSeries.chart.plotWidth || 1024),
                                 // currentSeries.data.length > 5,
                                 false,
                                false);
                        }

                        //if ((Date.now() - this.sensorChart.integrated.lastRedrawTimestamp >= 1000)) {
                        //    this.redrawIntegratedChart();
                        //}
                    }

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
