/* global define: true, ko: true */

// Main viewmodel class
define(['vm/genericVM'], function (GenericVM) {

    'use strict';

    function HRMVM(configuration) {

        GenericVM.call(this, configuration);

        this.timestamp = ko.observable();

        this.formattedTimestamp = ko.computed({
            read: function () {
                if (this.timestamp) {
                    return (new Date(this.timestamp())).toLocaleTimeString();
                }
            }.bind(this)
        });

        this._page = undefined;

        this.number = ko.observable();

        // HRM page 4

        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = ko.observable();

        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = ko.observable();

        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = ko.observable();

        this.previousHeartBeatEventTime = ko.observable();

        this.RRInterval = ko.observable();

        this.aggregatedRR = [];
        this.maxRR = Number.MIN_VALUE;
        this.minRR = Number.MAX_VALUE;

        this.init(configuration);

    }

    HRMVM.prototype = Object.create(GenericVM.prototype);
    HRMVM.prototype.constructor = HRMVM;

    HRMVM.prototype.INVALID_HR = 0x00;

    HRMVM.prototype.yAxis = {
      id :          'heartrate-yAxis',
      id_rr :       'heartrate-rr-yAxis',

    };

    HRMVM.prototype.xAxis = {
      id_rr : 'heartrate-rr-xAxis'
    };

    HRMVM.prototype.init = function (configuration)
    {
        var page = configuration.page;


        this.addAxis({

           id: this.xAxis.id_rr,

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

           offset : 32+28,

           showEmpty : false // Don't show when (visible === false)

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

      },true);

        this.addAxis({
            id: this.yAxis.id,
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

        },false);

        this.addAxis({
            id: this.yAxis.id_rr,
            title: {
                //text: 'RR',
                text : null,
                style: {
                    color: 'gray',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }
            },

            //min: 0,
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

        },false);

        this.addSeries(page, {
            hrm :  {
              name: this.rootVM.languageVM.heartrate().message,
              id: 'HRM-current-',
              color: 'red',
              data: [], // tuples [timestamp,value]
              type: 'spline',

              marker: {
                  enabled: false
                  // radius : 2
              },

              yAxis: this.yAxis.id,

              tooltip: {
                  enabled: false
              },

              //tooltip: {
              //    valueDecimals: 0,
              //    valueSuffix: ' bpm'
              //},

              // Disable generation of tooltip data for mouse tracking - improve performance

              enableMouseTracking: false

          },

          rr : {
              name: 'RR',
              id: 'RR-' ,
              color: 'red',
              data: [],
              type: 'scatter',

              marker: {
                  enabled: true,
                  radius : 2
              },

              yAxis: this.yAxis.id_rr,
              xAxis: this.xAxis.id_rr,

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

          },

          identity : {
              name : 'LOI', // Line Of Identity
              id : 'identity-',
              color : 'gray',
              data : [],
              type : 'line',
              yAxis : this.yAxis.id_rr,
              xAxis : this.xAxis.id_rr,

              dashStyle: 'shortdot',

               tooltip: {
                  enabled: false
              },
               marker: {
                  enabled: false
                  // radius : 2
              },
              enableMouseTracking: false,

              visible: false
          }

          });

        this.updateFromPage(page); // Run update on page (must be the last operation -> properties must be defined on viewmodel)

        this.addPoint(page);
    };

    // Plot poincare-chart of RR
    HRMVM.prototype.processRR = function (page) {

        var len,
            RRmeasurementNr,
            xRR,
            yRR,
            n;

        if (!page.aggregatedRR) {
           return;
        }

       // Copy buffered RR data to maintain the whole RR series

       for (len = page.aggregatedRR.length, RRmeasurementNr = 0; RRmeasurementNr < len; RRmeasurementNr++) {

             n = this.aggregatedRR.length-1;

             this.aggregatedRR.push(page.aggregatedRR[RRmeasurementNr]);

             xRR = this.aggregatedRR[n];
             yRR = this.aggregatedRR[n+1];

             if (xRR !== undefined && yRR !== undefined)
             {

                this.maxRR = Math.max(xRR,yRR,this.maxRR);
                this.minRR = Math.min(xRR,yRR,this.minRR);

                this.series.rr.addPoint([xRR,yRR], false, false, false);

             }

       }

       // Synchronize axis extremes (set axis.userMin/Max/isDirtyExtremes in highcharts)

       this.series.rr.xAxis.setExtremes(this.minRR, undefined, false, false);
       this.series.rr.yAxis.setExtremes(this.minRR, undefined, false, false);

       // Update line of identity
       this.series.identity.setData([[this.minRR,this.minRR],[this.maxRR,this.maxRR]],false,false,false);

    };

    HRMVM.prototype.addPoint = function (page)
    {

        var settingVM = this.rootVM.settingVM;

         if (page.computedHeartRate !== undefined && page.computedHeartRate !== HRMVM.prototype.INVALID_HR) {


            this.series.hrm.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, page.computedHeartRate], false, false, false);

        }

          this.processRR(page);
    };

    HRMVM.prototype.updateFromPage = function (page) {

        this._page = page;

        if (page.number !== undefined) {
            this.number(page.number);
        }

        // HRM Page 4/0 - main

         // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        if (page.heartBeatEventTime) {
            this.heartBeatEventTime(page.heartBeatEventTime);
        }

        // Counter for each heart beat event, rollover 255 counts
        if (page.heartBeatCount)
        {
            this.heartBeatCount(page.heartBeatCount);
        }

        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        if (page.computedHeartRate)
        {
            this.computedHeartRate(page.computedHeartRate);
        }

        if (page.previousHeartBeatEventTime)
        {
            this.previousHeartBeatEventTime(page.previousHeartBeatEventTime);
        }

        if (page.RRInterval)
        {
            this.RRInterval(Math.round(page.RRInterval));
        }

        this.updateBackgroundPage(page);

    };

    HRMVM.prototype.reset = function ()
    {
        this.number(undefined);
        this.heartBeatEventTime(undefined);
        this.heartBeatCount(undefined);
        this.computedHeartRate(undefined);
        this.previousHeartBeatEventTime(undefined);
        this.RRInterval(undefined);

        GenericVM.prototype.reset.call(this);

    };

    /* jshint ignore: start */
    HRMVM.prototype.getTemplateName = function (item) {
        // return undefined;
        return "HRM-template";
    };
    /* jshint ignore: end */

    return HRMVM;

});
