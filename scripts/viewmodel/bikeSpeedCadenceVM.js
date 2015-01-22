/* global define: true, ko: true */

define(['vm/genericVM', 'profiles/bike_spdcad/deviceProfile_SPDCAD'], function (GenericVM, deviceProfileSPDCAD) {

    'use strict';

    function SPDCADVM(configuration) {

        GenericVM.call(this, configuration);

        this._page = undefined;

        this.number = ko.observable();

        this.timestamp = ko.observable();

        this.formattedTimestamp = ko.computed({

            read: function () {
                if (this.timestamp && this.timestamp()) {
                    return (new Date(this.timestamp())).toLocaleTimeString();
                }
            }.bind(this)
        });

        //this.distance = ko.observable();

        this.speed = ko.observable();

        // Access via prototype object, deviceProfileSPDCAD reference to the constructor function. not to an instance so its deviceProfileSPDCAD.WHEEL_CIRCUMFERENCE will return undefined
        this.wheelCircumference = ko.observable(deviceProfileSPDCAD.prototype.WHEEL_CIRCUMFERENCE); // meters

        this.formattedWheelCircumference = ko.computed( {
            read: function ()
            {

                  return this.wheelCircumference().toFixed(3);
            }.bind(this),

            write : function (value)
            {
                // Convert from string to number
                this.wheelCircumference(Number(value));
            }.bind(this)
        });

        this.cadence = ko.observable();

        this.formattedCadence = ko.computed({

            read: function () {
                if (this.cadence() !== undefined) {
                    return Math.round(this.cadence());
                } else {
                    return '--.-';
                }

            }.bind(this)
        });

        // Additional properties based on pages

        this.cumulativeDistance = ko.observable(0);

        // Distance mode metric/mile
        this.distanceMode = ko.observable(SPDCADVM.prototype.DISTANCE_MODE.METRIC);

        this.formattedCumulativeDistance = ko.computed({

            read: function () {

                var distStr = '-.--';

                if (this.cumulativeDistance() !== undefined) {

                    switch (this.distanceMode()) {

                        case SPDCADVM.prototype.DISTANCE_MODE.MILE_INTERNATIONAL:

                            if (this.cumulativeDistance() > SPDCADVM.prototype.CONVERSION_FACTOR.INTERNATIONAL_METERS)
                            {
                                distStr = (this.cumulativeDistance() / SPDCADVM.prototype.CONVERSION_FACTOR.INTERNATIONAL_METERS).toFixed(2);
                            } else {
                                distStr = (this.cumulativeDistance() / SPDCADVM.prototype.CONVERSION_FACTOR.INTERNATIONAL_METERS).toFixed(3);
                            }
                            break;

                        default:

                            if (this.cumulativeDistance() < 1000) {
                                distStr = (this.cumulativeDistance() / 1000).toFixed(3);
                            }
                            else {
                                distStr = (this.cumulativeDistance() / 1000).toFixed(2);
                            }
                                break;
                    }
                }

                return distStr;

            }.bind(this)
        });

        this.speedMode = ko.observable(SPDCADVM.prototype.SPEED_MODE.SPEED);

        this.formattedSpeed = ko.computed({

            read: function () {

                var speedStr = '--.-',
                    speed = this.speed();

                if (speed !== undefined) {

                    switch (this.speedMode()) {

                        //case SPDCADVM.prototype.SPEED_MODE.TEMPO:

                        //    break;

                        default:

                            speedStr = this.speed().toFixed(1);
                            break;
                    }
                }

                return speedStr;

            }.bind(this)
        });

        this.previousCumulativeSpeedRevolutionCount = undefined; // Just declare intention to use


        this.init(configuration);

    }

    SPDCADVM.prototype = Object.create(GenericVM.prototype);
    SPDCADVM.prototype.constructor = SPDCADVM;

    SPDCADVM.prototype.SPEED_MODE = {
        TEMPO: 1, // min/km, min/mi
        SPEED: 2 // km/h, mi/h
    };

    SPDCADVM.prototype.DISTANCE_MODE = {
        METRIC: 1,
        MILE_INTERNATIONAL: 2

    };

    SPDCADVM.prototype.CONVERSION_FACTOR = {
        INTERNATIONAL_METERS: 1609.344,
        INTERNATIONAL_KM : 1.609344,
        KM_TO_1MILE : 0.621371192237334 // (1/1.609344)
      //  US: 1609.347219
    };

    SPDCADVM.prototype.onDistanceModeChange = function (useMile)
    {
        var newSeriesData = [],
            pointNr,
            len;

        if (useMile)
        {
            this.distanceMode(SPDCADVM.prototype.DISTANCE_MODE.MILE_INTERNATIONAL);

            for (pointNr=0, len = this.series.speed.xData.length; pointNr < len; pointNr++) {
                  newSeriesData.push([this.series.speed.xData[pointNr],this.convert.fromKmToMile(this.series.speed.yData[pointNr])]);
            }
        } else {

            this.distanceMode(SPDCADVM.prototype.DISTANCE_MODE.METRIC);

            for (pointNr=0, len = this.series.speed.xData.length; pointNr < len; pointNr++) {
                    newSeriesData.push([this.series.speed.xData[pointNr],this.convert.fromMileToKm(this.series.speed.yData[pointNr])]);
            }

        }


        this.series.speed.setData(newSeriesData,true);
    };

    SPDCADVM.prototype.convert = {

        fromKmToMile : function (value)
        {
            return SPDCADVM.prototype.CONVERSION_FACTOR.KM_TO_1MILE * value;
        },

        fromMileToKm : function (value)
        {
            return SPDCADVM.prototype.CONVERSION_FACTOR.INTERNATIONAL_KM * value;
        }
    };

    SPDCADVM.prototype.init = function (configuration)
    {
        var page = configuration.page,
            sensorId = this.sensorId(),
            seriesOptions = {};

        this.deviceType = page.broadcast.channelId.deviceType;

         this.getSetting(['wheelCircumference-'+sensorId],true);

        // Init with global distance unit setting

        if (this.rootVM.settingVM.mileDistanceUnit()) {
           this.distanceMode(SPDCADVM.prototype.DISTANCE_MODE.MILE_INTERNATIONAL);
        }
        else {
           this.distanceMode(SPDCADVM.prototype.DISTANCE_MODE.METRIC);
        }
        // Update on subsequent changes
        this.rootVM.settingVM.mileDistanceUnit.subscribe(this.onDistanceModeChange.bind(this));

        if (this.deviceType === 121 || this.deviceType === 122) {
          seriesOptions.cadence = {
               name: this.rootVM.languageVM.cadence().message,
               id: 'SPDCAD-cadence-' ,
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

               visible : (function (vm)
                     {
                         if (vm.deviceType === 121) {
                           return false; // Turn of cadence, often just having speed available is the most relevant
                         } else {
                           return true;
                         }
                     })(this)
           };
        }

        if (this.deviceType === 121 || this.deviceType === 123) {

           seriesOptions.speed = {

               name: this.rootVM.languageVM.speed().message,
               id: 'SPDCAD-speed-',
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

           };
        }

        this.addSeries(page, seriesOptions);

        this.updateFromPage(page); // Run update on page (must be the last operation -> properties must be defined on viewmodel)

         this.addPoint(page);

        // Update cumulative distance

    };

    SPDCADVM.prototype.addPoint = function (page)

    {
        var settingVM = this.rootVM.settingVM;

        if (page.cadence !== undefined) {

            this.series.cadence.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, page.cadence], false, false, false);
        }


        if (page.unCalibratedSpeed !== undefined) {

            // Converted speed taking wheel circumference into account
            this.series.speed.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, this.speed()], false, false, false);

        }
    };

    SPDCADVM.prototype.updateFromPage = function (page) {

       var timer = this.rootVM.timerVM._timer,
           relativeCumulativeSpeedRevolutionCount,
           revolutionDistance,
           previousCumulativeDistance;

        // For debugging, i.e inspect broadcast data
        this._page = page;

        // Update view model

        if (page.number !== undefined) {
            this.number(page.number);
        }

        if (page.timestamp) {
            this.timestamp(page.timestamp);
        }

        if (page.unCalibratedSpeed !== undefined) {
            if (this.distanceMode() === SPDCADVM.prototype.DISTANCE_MODE.METRIC) { // km/h
                this.speed(3.6 * this.wheelCircumference() * page.unCalibratedSpeed);
            }
            else if (this.distanceMode() === SPDCADVM.prototype.DISTANCE_MODE.MILE_INTERNATIONAL) { // mph
                this.speed(2.2369362920544 * this.wheelCircumference() * page.unCalibratedSpeed);
            }
        }

        if (page.cadence !== undefined) {
            this.cadence(page.cadence);
        }

        // Distance

        if (this.previousCumulativeSpeedRevolutionCount !== undefined && timer.state === Object.getPrototypeOf(timer).STATE.STARTED)
        {

             // Only update cumulatated distance  when timer is running

              relativeCumulativeSpeedRevolutionCount = page.cumulativeSpeedRevolutionCount - this.previousCumulativeSpeedRevolutionCount;
              if (relativeCumulativeSpeedRevolutionCount < 0) { // In case of rollover
                relativeCumulativeSpeedRevolutionCount += 0xFFFF; // Field is 2 bytes
              }
              revolutionDistance = this.wheelCircumference()*relativeCumulativeSpeedRevolutionCount;
              previousCumulativeDistance = this.cumulativeDistance();
              this.cumulativeDistance(previousCumulativeDistance + revolutionDistance);

        }

        this.previousCumulativeSpeedRevolutionCount = page.cumulativeSpeedRevolutionCount;

        this.updateBackgroundPage(page); // Background pages 1-3

    };

    /* jshint ignore: start */
    SPDCADVM.prototype.getTemplateName = function (item) {
        // return undefined;
        return "spdcad-template";
    };
    /* jshint ignore: end */

    SPDCADVM.prototype.reset = function () {
        this.number(undefined);
        this.timestamp(undefined);
        this.speed(undefined);
        this.cadence(undefined);
        this.cumulativeDistance(0);

        GenericVM.prototype.reset.call(this);

    };

   return SPDCADVM;

});
