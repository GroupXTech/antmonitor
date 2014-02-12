/* global define: true */

// Generic viewmodel, for ANT+ common pages 80 81 82
define(['require', 'module', 'exports', 'logger', 'profiles/Page'], function (require, module, exports, Logger, GenericPage) {
    'use strict';

    function GenericVM(configuration) {
        // this._logger = new Logger(configuration);
        this._logger = configuration.logger || new Logger(configuration); // Use sensorVM logger, or create a new one

        // Common page 80 - Manufacturer info.

        this.HWRevision = ko.observable();
        this.manufacturerID = ko.observable();
        this.modelNumber = ko.observable();


        // Common page 81 - Product info.

        this.SWRevision = ko.observable();
        this.serialNumber = ko.observable();

        // Common page 82 - Battery status

        this.batteryStatus = ko.observable();
        this.batteryStatusString = ko.observable();
        this.cumulativeOperatingTime = ko.observable();
        this.cumulativeOperatingTimeString = ko.observable();
        this.lastBatteryReset = ko.observable();
    }

    // Merge common page into viewmodel
    GenericVM.prototype.updateCommonPage = function (page)
    {
        // Common page 82

        //TEST this.batteryStatus(2);
        //this.batteryStatusString("Good");
        //this.cumulativeOperatingTime(2);


        switch (page.number) {

            case GenericPage.prototype.COMMON.PAGE80:

                if (page.HWRevision)
                    this.HWRevision(page.HWRevision);

                if (page.manufacturerID)
                    this.manufacturerID(page.manufacturerID);

                if (page.modelNumber)
                    this.modelNumber(page.modelNumber);

                break;

            case GenericPage.prototype.COMMON.PAGE81:

                if (page.SWRevision) {
                    this.SWRevision(page.SWRevision);
                }

                if (page.serialNumber) {
                    this.serialNumber(page.serialNumber);
                }

                break;

            case GenericPage.prototype.COMMON.PAGE82:

                if (page.descriptive) {
                    this.batteryStatus(page.descriptive.batteryStatus);
                    this.batteryStatusString(page.batteryStatusString);
                }

                if (page.cumulativeOperatingTime) {
                    this.cumulativeOperatingTime(page.cumulativeOperatingTime);
                    this.cumulativeOperatingTimeString(page.cumulativeOperatingTimeString);
                    this.lastBatteryReset(page.lastBatteryReset);
                }

                break;
        }
    }

    module.exports = GenericVM;

    return GenericVM;

});