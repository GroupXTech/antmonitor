/* global define: true */

// Main viewmodel class
define(['require','module','exports','logger','profiles/Page','vm/genericVM','converter/temperatureConverter'], function(require,module,exports,Logger,GenericPage, GenericVM, TemperatureConverter) {
    'use strict';
    
    function TemperatureVM(configuration) {

        GenericVM.call(this, configuration);

        this.sensorId = ko.observable();

        this.tempConverter = new TemperatureConverter();

        // Idea: Hook up temperatureMode observable to settingsVM
        this.temperatureMode = configuration.temperatureMode || ko.observable(TemperatureVM.prototype.MODE.CELCIUS);
        if (configuration && configuration.rootVM && configuration.rootVM.settingVM)
            configuration.rootVM.settingVM.temperature_fahrenheit.subscribe(function (useFahrenheit)
                                                                            {

                                                                                if (useFahrenheit)
                                                                                    this.temperatureMode(TemperatureVM.prototype.MODE.FAHRENHEIT);
                                                                                else
                                                                                   this.temperatureMode(TemperatureVM.prototype.MODE.CELCIUS);
                                                                            }.bind(this));

        this.number = ko.observable();

        // Current temperature
        this.currentTemp = ko.observable();

        var getFormattedTemp = function (tempObs, toFixedDigits) {
            var formattedTemp;

            if (tempObs() === undefined)
                return '--.--'; // Sensor discovered, but temperature observation not available yet

            switch (this.temperatureMode()) {
                case TemperatureVM.prototype.MODE.FAHRENHEIT:

                    //formattedTemp = (tempObs()*(9/5)+32);
                    formattedTemp = this.tempConverter.fromCelciusToFahrenheit(tempObs()).toFixed(toFixedDigits || 2);
                    break;

                default:

                    formattedTemp = tempObs().toFixed(toFixedDigits || 2);
                    break;
            }
            return formattedTemp;
        }.bind(this);

        this.formattedCurrentTemp = ko.computed({
            read:
            function () {
                return getFormattedTemp(this.currentTemp, 2);
            }.bind(this)
        });

        this.eventCount = ko.observable();

        // 24 h high
        this.high24H = ko.observable();
        this.formattedHigh24H = ko.computed({
            read: function () {
                return getFormattedTemp(this.high24H, 1) ;

            }.bind(this)

        });

        // 24 h low
        this.low24H = ko.observable();
        this.formattedLow24H = ko.computed({
            read: function () {
                return getFormattedTemp(this.low24H, 1) ;
            }.bind(this)

        });

        this.location = ko.observable();
      

        this.timestamp = ko.observable();
        this.formattedTimestamp = ko.computed({
            read: function () {
                if (this.timestamp)
                    return (new Date(this.timestamp())).toLocaleTimeString();
            }.bind(this)
        });

        this._page = undefined;

    };
    
     TemperatureVM.prototype = Object.create(GenericVM.prototype);
     TemperatureVM.prototype.constructor = TemperatureVM;
    
    TemperatureVM.prototype.MODE = {
        CELCIUS : 'celcius',
        FAHRENHEIT : 'fahrenheit'
    };
    
     TemperatureVM.prototype.MODES = [TemperatureVM.prototype.MODE.CELCIUS,TemperatureVM.prototype.MODE.FAHRENHEIT];
    
//    TemperatureVM.prototype.getValue = function (temperatureObs,masterVM,digits)
//    {
//        var valueTemp = temperatureObs();
//        
//        if (valueTemp === undefined)
//        {
//            this._logger.log('error','Got undefined temperature',masterVM);
//            return undefined;
//        }
//        
//        console.warn("Value",valueTemp,masterVM);
//        
//        var tempMode = masterVM.settingVM.temperatureMode();
//        if (tempMode === TemperatureVM.prototype.MODE.CELCIUS)
//           return temperatureObs().toFixed(digits);
//        else if (tempMode === TemperatureVM.prototype.MODE.FAHRENHEIT) {
//            // http://nn.wikipedia.org/wiki/Formlar_for_temperaturomrekning
//            temperature(valueTemp*(9/5)+32); // Skip this return by knockout to enable chaining
//            return temperatureObs().toFixed(digits);
//        }
//        else {
//            this._logger.log('error','Unknown temperature mode',tempMode);
//            return undefined;
//        }
//    };
//    
    // Takes page with current, low/high 24 h and puts it into the viewModel
     TemperatureVM.prototype.updateFromPage = function (page) {

         // For debugging, i.e inspect broadcast data
         this._page = page;

         // Update view model

         if (page.broadcast && page.broadcast.channelId)
             this.sensorId(page.broadcast.channelId.sensorId);

         if (page.number !== undefined)
             this.number(page.number);

         if (page.currentTemp)
             this.currentTemp(page.currentTemp);

         if (page.hour24Low)
             this.low24H(page.hour24Low);

         if (page.hour24High)
             this.high24H(page.hour24High);

         if (page.timestamp)
             this.timestamp(page.timestamp);

        // if ((page.profile && page.profile.hasCommonPages) || !page.profile)
             this.updateCommonPage(page);
     };
     
    TemperatureVM.prototype.getTemplateName = function (item)
    {
       // return undefined;
         return "temperature-template";
    };

    TemperatureVM.prototype.reset = function ()
    {
        this.sensorId(undefined);
        this.number(undefined);
        this.currentTemp(undefined);
        this.low24H(undefined);
        this.high24H(undefined);
        this.timestamp(undefined);
    }
    
    module.exports = TemperatureVM;
    return module.exports;
});
