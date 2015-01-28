/* global define: true, ko: true */

define(['vm/genericVM'], function (GenericVM) {

    'use strict';

    function BikePowerVM(configuration) {

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


        this.updateEventCount = ko.observable();

        this.pedalPower = ko.observable();

        this.rightPedalPowerContribution = ko.observable();

        this.pedalPowerPercent = ko.observable();

        this.instantaneousCadence = ko.observable();

        this.accumulatedPower = ko.observable();

        this.instantaneousPower = ko.observable();

        this.pageNotUpdated = ko.observable();

        this.init(configuration);

    }

    BikePowerVM.prototype = Object.create(GenericVM.prototype);
    BikePowerVM.prototype.constructor = BikePowerVM;


    BikePowerVM.prototype.init = function (configuration)
    {
        var page = configuration.page,
            seriesOptions = {};

        this.deviceType = page.broadcast.channelId.deviceType;


           seriesOptions.instantaneousPower = {

               name: this.rootVM.languageVM.power().message,
               id: 'BIKE_POWER-instantaneousPower-',
               color: 'orange',
               data: [], // tuples [timestamp,value]
               type: 'spline',

               marker: {
                   enabled: false
                   // radius : 2
               },

               yAxis: 5,

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

         seriesOptions.instantaneousCadence = {
               name: this.rootVM.languageVM.cadence().message,
               id: 'BIKE_POWER-instantaneousCadence' ,
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

             visible : false,

               // Disable generation of tooltip data for mouse tracking - improve performance

               enableMouseTracking: false,


           };

        this.addSeries(page, seriesOptions);

        this.updateFromPage(page); // Run update on page (must be the last operation -> properties must be defined on viewmodel)

         this.addPoint(page);

    };

    BikePowerVM.prototype.addPoint = function (page)

    {
        var settingVM = this.rootVM.settingVM;

        // Don't update series when there is no update event count
        if (page.pageNotUpdated)
        {
            return;
        }

        if (page.instantaneousPower !== undefined) {

            this.series.instantaneousPower.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, page.instantaneousPower], false, false, false);
        }

        if (page.instantaneousCadence !== undefined) {

            this.series.instantaneousCadence.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, page.instantaneousCadence], false, false, false);
        }

    };

    BikePowerVM.prototype.updateFromPage = function (page) {

        // For debugging, i.e inspect broadcast data
        this._page = page;

        // Update view model

        if (page.number !== undefined) {
            this.number(page.number);
        }

        if (page.timestamp) {
            this.timestamp(page.timestamp);
        }

        this.pageNotUpdated(page.pageNotUpdated);

        if (page.pageNotUpdated === undefined)
        {

            if (page.instantaneousPower !== undefined) {
                this.instantaneousPower(page.instantaneousPower);
            }


            if (page.instantaneousCadence !== undefined) {
                this.instantaneousCadence(page.instantaneousCadence);
            }
        }


        this.updateBackgroundPage(page); // Background pages

    };

    /* jshint ignore: start */
    BikePowerVM.prototype.getTemplateName = function (item) {
        // return undefined;
        return "bike-power-template";
    };
    /* jshint ignore: end */

    BikePowerVM.prototype.reset = function () {
        this.number(undefined);
        this.timestamp(undefined);
        this.instantaneousPower(undefined);
        this.instantaneousCadence(undefined);
        this.pageNotUpdated(undefined);

        GenericVM.prototype.reset.call(this);

    };

   return BikePowerVM;

});
