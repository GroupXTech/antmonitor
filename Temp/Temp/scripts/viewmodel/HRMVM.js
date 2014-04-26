/* global define: true, ko: true */

// Main viewmodel class
define(['vm/genericVM'], function (GenericVM) {

    'use strict';

    function HRMVM(configuration) {

        GenericVM.call(this, configuration);

        this.timestamp = ko.observable();

        this.formattedTimestamp = ko.computed({
            read: function () {
                if (this.timestamp)
                    return (new Date(this.timestamp())).toLocaleTimeString();
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

        // HRM page 1

        this.cumulativeOperatingTimeString = ko.observable();
        this.lastBatteryReset = ko.observable();

        // HRM page 2

        this.manufacturerID = ko.observable();
        this.serialNumber = ko.observable();
        this.manufacturerString = ko.observable();

        // HRM page 3

        this.softwareVersion = ko.observable();
        this.hardwareVersion = ko.observable();
        this.modelNumber = ko.observable();

        this.aggregatedRR = [];
        this.maxRR = Number.MIN_VALUE;
        this.minRR = Number.MAX_VALUE;

        this.init(configuration);

    }

    HRMVM.prototype = Object.create(GenericVM.prototype);
    HRMVM.prototype.constructor = HRMVM;

    HRMVM.prototype.INVALID_HR = 0x00;
    
    HRMVM.prototype.init = function (configuration)
    {
        var page = configuration.page;

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

              yAxis: 5,
              xAxis: 1,

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
              name : 'identity',
              id : 'identity-',
              color : 'gray',
              data : [],
              type : 'line',
              yAxis : 5,
              xAxis : 1,

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

        if (!page.aggregatedRR)
           return;

       // Copy buffered RR data to maintain the whole RR series

       for (len = page.aggregatedRR.length, RRmeasurementNr = 0; RRmeasurementNr < len; RRmeasurementNr++) {

             n = this.aggregatedRR.length-1;

             // Maybe: It's also possible to get the data directly from the series maintained inside highcharts (to minimize memory)
             this.aggregatedRR.push(page.aggregatedRR[RRmeasurementNr]);

             xRR = this.aggregatedRR[n];
             yRR = this.aggregatedRR[n+1];

             if (xRR !== undefined && yRR !== undefined)
             {

                if (xRR > this.maxRR)
                   this.maxRR = xRR;

                if (yRR > this.maxRR)
                   this.maxRR = yRR;

                if (xRR < this.minRR)
                   this.minRR = xRR;

                if (yRR < this.minRR)
                   this.minRR = yRR;

                this.series.rr.addPoint([xRR,yRR], false, false, false);

             }

       }

       // Synchronize axis extremes (set axis.userMin/Max/isDirtyExtremes in highcharts)

       this.series.rr.xAxis.setExtremes(this.minRR, this.maxRR, false, false);
       this.series.rr.yAxis.setExtremes(this.minRR, this.maxRR, false, false);

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

        if (page.number !== undefined)
            this.number(page.number);

        // HRM Page 4/0 - main
        
         // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        if (page.heartBeatEventTime)
            this.heartBeatEventTime(page.heartBeatEventTime);
    
        // Counter for each heart beat event, rollover 255 counts
        if (page.heartBeatCount)
            this.heartBeatCount(page.heartBeatCount);
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        if (page.computedHeartRate)
            this.computedHeartRate(page.computedHeartRate);
        
        if (page.previousHeartBeatEventTime)
            this.previousHeartBeatEventTime(page.previousHeartBeatEventTime);
        
        if (page.RRInterval)
            this.RRInterval(Math.round(page.RRInterval));

        // HRM page 1 - background

        if (page.cumulativeOperatingTime)
            this.cumulativeOperatingTime(page.cumulativeOperatingTime);

        if (page.cumulativeOperatingTimeString)
            this.cumulativeOperatingTimeString(page.cumulativeOperatingTimeString);

        if (page.lastBatteryReset)
            this.lastBatteryReset(page.lastBatteryReset);

        // HRM page 2 - background

        if (page.manufacturerID)
            this.manufacturerID(page.manufacturerID);

        if (page.serialNumber)
            this.serialNumber(page.serialNumber);

        if (page.manufacturerID && page.serialNumber) {
            if ((page.serialNumber >> 16) === 0)
                this.manufacturerString('Manufacturer ' + page.manufacturerID + ' SN ' + page.serialNumber);
            else
                this.manufacturerString('Manufacturer '+page.manufacturerID +' SN '+ page.serialNumber+' ('+page.broadcast.channelId.deviceNumber+')');
        }

        //if (page.broadcast.channelId && page.broadcast.channelId.deviceNumber)
        //    this.deviceNumber(page.broadcast.channelId.deviceNumber);

        // HRM page 3

        if (page.hardwareVersion)
            this.hardwareVersion(page.hardwareVersion);

        if (page.softwareVersion)
            this.softwareVersion(page.softwareVersion);

        if (page.modelNumber)
            this.modelNumber(page.modelNumber);


    };
    
    HRMVM.prototype.reset = function ()
    {
        this.number(undefined);
        this.heartBeatEventTime(undefined);
        this.heartBeatCount(undefined);
        this.computedHeartRate(undefined);
        this.previousHeartBeatEventTime(undefined);
        this.RRInterval(undefined);
        this.cumulativeOperatingTime(undefined);
        this.cumulativeOperatingTimeString(undefined);
        this.lastBatteryReset(undefined);
        this.manufacturerID(undefined);
        this.serialNumber(undefined);
        this.manufacturerString(undefined);
        this.hardwareVersion(undefined);
        this.softwareVersion(undefined);
        this.modelNumber(undefined);
    };

    HRMVM.prototype.getTemplateName = function (item) {
        // return undefined;
        return "HRM-template";
    };

    return HRMVM;

});
