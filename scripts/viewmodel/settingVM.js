/* global define: true, ko:true */

define(['vm/genericVM'], function _requireDefineSettingVM(GenericVM) {

     'use strict';

    function SettingVM(configuration)
    {
        if (!configuration)
        {
            configuration = {};
        }

        configuration.sensorId = 'settingVM';

        GenericVM.call(this, configuration);

        this.mileDistanceUnit = ko.observable(false);

        this.showAdditionalInfo = ko.observable(false);

        this.showCredits = ko.observable(false);

         this.timezoneOffsetInMilliseconds = this.getTimezoneOffsetInMilliseconds();


        // Keeps track of visibility of sensors in short sensor overview and in the integrated chart

        this.showSensors = {

            HRM : ko.observable(true),

            SPDCAD : ko.observable(true),

            ENVIRONMENT : ko.observable(true),

            BIKE_POWER : ko.observable(true)

        };

        this.showTimer = ko.observable(true);

        // ENVIRONMENT

        this.show24HMaxMin = ko.observable(false);

        this.fahrenheit = ko.observable(false);


        // Behavior

        this.toggleShowCredits = SettingVM.prototype.toggleShowCredits.bind(this);


        this.toggleShowSensor = SettingVM.prototype.toggleShowSensor.bind(this);

        this.init(configuration);

    }

    SettingVM.prototype = Object.create(GenericVM.prototype);
    SettingVM.prototype.constructor = SettingVM;

    SettingVM.prototype.init = function ()

    {
        var sensorId = this.sensorId();
        this.getSetting(['fahrenheit-'+sensorId,'show24HMaxMin-'+sensorId,'showAdditionalInfo-'+sensorId,'mileDistanceUnit-'+sensorId],true);
    };

    SettingVM.prototype.getTimezoneOffsetInMilliseconds = function () {
        return (new Date()).getTimezoneOffset() * -60000; // 1000 ms pr second = 60000 ms / minute
    };

    SettingVM.prototype.toggleShowCredits = function (data, event) {
        this.showCredits(!this.showCredits());
    };

    // Function is also called during applyBindings at initialization
    SettingVM.prototype.toggleShowSensor = function (sensorType,viewModel,event) {

       this.showSensors[sensorType](!this.showSensors[sensorType]());

        var visible = this.showSensors[sensorType](),
            chart,
            currentSeries,
            seriesNr,
            len;

        // Toggle series visibility for device type, i.e hrm

        if (!(viewModel.sensorChart && viewModel.sensorChart.integrated && viewModel.sensorChart.integrated.chart))
        {
            return;
        }
            chart = viewModel.sensorChart.integrated.chart;

            for (seriesNr = 0, len = chart.series.length; seriesNr < len; seriesNr++) {

                currentSeries = chart.series[seriesNr];

                if (currentSeries.options.id.indexOf(sensorType) !== -1) {

                    if (visible && !currentSeries.visible) {

                        currentSeries.show();

                    }

                    else if (currentSeries.visible) {

                        currentSeries.hide();
                    }
                }

            }

    };

    return SettingVM;
});
