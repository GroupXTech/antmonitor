/* global define: true */

// Main viewmodel class
define(['logger','vm/HRMVM','vm/temperatureVM'], function(Logger,HRMVM, TemperatureVM) {

    'use strict';
    
    function SensorVM(configuration) 
    {
        this._logger = new Logger(configuration);


            this.devices = {
                HRM: ko.observableArray(),
                ENVIRONMENT: ko.observableArray(),
                SPDCAD: ko.observableArray()
            };

    }
    
    SensorVM.prototype.getLogger = function ()
    {
        return this._logger;
    };
    
    SensorVM.prototype.getTemplateName = function (viewModelItem)
    {
        // item is now a viewModel in the sensor array
        var templateName = viewModelItem.getTemplateName();
        
        if (templateName === undefined)
            this._logger.log('error','Could not find template name for viewModel item',viewModelItem);
        
        return templateName;
    };
    
   return SensorVM;

});
