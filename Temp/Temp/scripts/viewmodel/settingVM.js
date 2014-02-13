define(['logger'], function _requireDefineSettingVM(Logger) {
    'use strict'

    function SettingVM(configuration)
    {
        this._logger = new Logger(configuration);

        this.logging = ko.observable(true),     // Enable logging to console  - will decrease performance

        this.showAdditionalInfo = ko.observable(false),

        this.showCredits = ko.observable(false),

        //this.temperatureModes: TemperatureVM.prototype.MODES,

        this.showSensors = {

            HRM : ko.observable(true),
                    
            SPDCAD : ko.observable(true),

            ENVIRONMENT : ko.observable(true),

            };

        this.showTimer = ko.observable(false)

        // Behavior

        this.toggleShowCredits = SettingVM.prototype.toggleShowCredits.bind(this);
        this.toggleShowAdditionalInfo = SettingVM.prototype.toggleShowAdditionalInfo.bind(this);
        this.toggleShowTimer = SettingVM.prototype.toggleShowTimer.bind(this);
        this.toggleShowSensor = SettingVM.prototype.toggleShowSensor.bind(this); 

    }

    SettingVM.prototype.toggleShowCredits = function (data, event) {
        this.showCredits(!this.showCredits());
    };

    SettingVM.prototype.toggleShowAdditionalInfo = function (data, event) {
        this.showAdditionalInfo(!this.showAdditionalInfo());
    };

    SettingVM.prototype.toggleShowTimer = function (data,event)
    {
        this.showTimer(!this.showTimer());
    }

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
        
    }

    return SettingVM;
})