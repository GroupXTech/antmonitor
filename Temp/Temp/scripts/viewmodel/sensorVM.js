/* global define: true */

// Main viewmodel class
define(['require','module','exports','logger','vm/HRMVM','vm/temperatureVM'], function(require,module,exports,Logger,HRMVM, TemperatureVM) {
    'use strict';
    
    function SensorVM(configuration) 
    {
        this._logger = new Logger(configuration);                 
        this.deviceTypeVM = ko.observableArray();

            this.devices = {
                HRM: ko.observableArray(),
                ENVIRONMENT: ko.observableArray(),
                SPDCAD: ko.observableArray()
            };


        //this.HRMDevices = ko.computed(function ()
            
        //{
        //    var sensorNr, len,
        //        deviceTypeVM,
        //        HRMDevices = ko.observableArray();

        //    for (sensorNr=0,len=this.deviceTypeVM().length;sensorNr<len;sensorNr++)
        //    {
        //        deviceTypeVM = this.deviceTypeVM()[sensorNr];
        //        if (deviceTypeVM instanceof HRMVM)
        //            HRMDevices.push(deviceTypeVM);
               
        //    }

        //    return HRMDevices;

        //}, this);
    }
    
    SensorVM.prototype.getLogger = function ()
    {
        return this._logger;
    }
    
    SensorVM.prototype.getTemplateName = function (viewModelItem)
    {
        // item is now a viewModel in the sensor array
        var templateName = viewModelItem.getTemplateName();
        
        if (templateName === undefined)
            this._logger.log('error','Could not find template name for viewModel item',viewModelItem);
        
        return templateName;
    };
    
    module.exports = SensorVM;
    return module.exports;
});