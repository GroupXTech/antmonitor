/* global define: true */

// Main viewmodel class
define(['require','module','exports','logger'], function(require,module,exports,Logger) {
    'use strict';
    
     function TemperatureVM(configuration) {
         
        // this._logger = new Logger(configuration.log);
         this._logger = configuration.logger || new Logger(configuration.log); // Use sensorVM logger, or create a new one
         
         // Idea: Hook up temperatureMode observable to settingsVM
         this.temperatureMode = configuration.temperatureMode || ko.observable(TemperatureVM.prototype.MODE.CELCIUS);
         
            this.number = ko.observable();
         
          // Current temperature
         this.currentTemp = ko.observable();
         
         var getFormattedTemp = function (tempObs,toFixedDigits) {
              var formattedTemp;
             
              if (tempObs() === undefined)
                     return '--.--'; // Sensor discovered, but temperature observation not available yet
             
             switch (this.temperatureMode()) {
                        case TemperatureVM.prototype.MODE.FAHRENHEIT :
                   
                          formattedTemp = (tempObs()*(9/5)+32).toFixed(toFixedDigits || 2);
                             break;
                        
                        default :
                             
                             formattedTemp = tempObs().toFixed(toFixedDigits || 2);
                             break;
                     }
             return formattedTemp;
         }.bind(this);
         
         this.formattedCurrentTemp = ko.computed({
             read: 
             function () {
                  return getFormattedTemp(this.currentTemp,2);
             }.bind(this)
            });
         
            this.eventCount = ko.observable();
         
         // 24 h high
          this.high24H = ko.observable();
          this.formattedHigh24H = ko.computed({
             read: function () {
                return getFormattedTemp(this.high24H,1);
                
             }.bind(this)
            
         });
         
         // 24 h low
          this.low24H = ko.observable();
          this.formattedLow24H = ko.computed({
             read: function () {
                return getFormattedTemp(this.low24H,1);
             }.bind(this)
            
         });

          this.location = ko.observable();
          var loc;
          loc = window.localStorage[configuration.sensorId + '-location'];
          if (loc)
              this.location(loc);

         // Subscribe to further updates via UI

          this.location.subscribe(function (newValue) {
              window.localStorage[configuration.sensorId + '-location'] = newValue;
          })

     }
    
    
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
    TemperatureVM.prototype.updateFromPage = function (page)
    {
        
        
        // Update view model


        if (page.currentTemp)
            this.currentTemp(page.currentTemp);
        
        if (page.hour24Low)
            this.low24H(page.hour24Low);
        
        if (page.hour24High)
              this.high24H(page.hour24High);
    };
    
    TemperatureVM.prototype.getTemplateName = function (item)
    {
       // return undefined;
         return "temperature-template";
    };
    
    module.exports = TemperatureVM;
    return module.exports;
});