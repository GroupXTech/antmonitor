/* global define: true */

// Main viewmodel class
define(['require','module','exports','logger'], function(require,module,exports,Logger) {
    'use strict';
    
    function SensorVM(configuration) 
    {
        this._logger = new Logger(configuration.log);                 
        this.measurement = ko.observableArray();
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