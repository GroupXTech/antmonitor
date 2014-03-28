/* global define: true, ko : true */

define(['vm/genericVM'], function(GenericVM) {

    'use strict';
    
    function SensorVM(configuration) 
    {
       GenericVM.call(this,configuration);


            this.devices = {
                HRM: ko.observableArray(),
                ENVIRONMENT: ko.observableArray(),
                SPDCAD: ko.observableArray()
            };

    }
    
    SensorVM.prototype = Object.create(GenericVM.prototype);
    SensorVM.constructor = SensorVM;

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
