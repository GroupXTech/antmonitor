/* global define: true, ko : true */

define(['vm/genericVM'], function(GenericVM) {

    'use strict';
    
    function SensorVM(configuration) 

    {
        if (!configuration)
          configuration = {};

       configuration.sensorId = 'sensorVM';

       GenericVM.call(this,configuration);

        this.devices = {
            HRM: ko.observableArray(),
            ENVIRONMENT: ko.observableArray(),
            SPDCAD: ko.observableArray()
        };

    }
    
    SensorVM.prototype = Object.create(GenericVM.prototype);
    SensorVM.prototype.constructor = SensorVM;
    
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
