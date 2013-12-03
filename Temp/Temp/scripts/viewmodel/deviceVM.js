/* global define: true */

// Main viewmodel class
define(['require', 'module', 'exports', 'logger'], function (require, module, exports, Logger) {
    'use strict';

    function DeviceVM(configuration) {
        this._logger = new Logger(configuration.log);
        this.device = ko.observableArray();
    }

    DeviceVM.prototype.getLogger = function () {
        return this._logger;
    }

    DeviceVM.prototype.getTemplateName = function (viewModelItem) {
        // item is now a viewModel in the sensor array
        var templateName = viewModelItem.getTemplateName();

        if (templateName === undefined)
            this._logger.log('error', 'Could not find template name for viewModel item', viewModelItem);

        return templateName;
    };

    module.exports = DeviceVM;
    return module.exports;
});