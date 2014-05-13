/* global define: true, ko:true */

define(['vm/genericVM'], function _requireDefineSettingVM(GenericVM) {

     'use strict';

    function SettingVM(configuration)
    {
        if (!configuration)
         configuration = {};

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
            return;
        
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


    //rootVM.settingVM.temperatureMode.subscribe(function (newMode) {

    //    var temperatureAxis = this.sensorChart.integrated.chart.yAxis[0],
    //        seriesData,
    //        TemperatureVM = this.viewModel.TemperatureVM;

    //    this.storage.set(this.storage.__proto__.key.temperaturemode, newMode);

    //    for (var serieNr = 0; serieNr < this.sensorChart.integrated.chart.series.length; serieNr++) {

    //        if (this.sensorChart.integrated.chart.series[serieNr].name.indexOf('Temperature') !== -1) {
    //            seriesData = this.sensorChart.integrated.chart.series[serieNr].options.data;

    //            // Convert y-point to requested temperature mode

    //            for (var point = 0; point < seriesData.length; point++) {
    //                if (newMode === TemperatureVM.prototype.MODE.FAHRENHEIT) {

    //                    seriesData[point][1] = this.tempConverter.fromCelciusToFahrenheit(seriesData[point][1]);


    //                } else if (newMode === TemperatureVM.prototype.MODE.CELCIUS) {
    //                    seriesData[point][1] = this.tempConverter.fromFahrenheitToCelcius(seriesData[point][1]);

    //                    temperatureAxis.setExtremes(-20, null, false);
    //                }

    //            }

    //            if (newMode === TemperatureVM.prototype.MODE.FAHRENHEIT)
    //                temperatureAxis.setExtremes(-4, null, false);
    //            else if (newMode === TemperatureVM.prototype.MODE.CELCIUS)
    //                temperatureAxis.setExtremes(-20, null, false);

    //            this.sensorChart.integrated.chart.series[serieNr].setData(this.sensorChart.integrated.chart.series[serieNr].options.data, false, false);

    //        }

    //    }

    //    this.redrawIntegratedChart();

    //}.bind(this));



    return SettingVM;
});
