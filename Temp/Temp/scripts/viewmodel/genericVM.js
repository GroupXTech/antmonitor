/* global define: true, ko: true */

// Generic viewmodel, for ANT+ common pages 80 81 82
define(['logger', 'profiles/Page','events'], function (Logger, GenericPage,EventEmitter) {
    'use strict';

    function GenericVM(configuration) {

        var  sensorId;

        EventEmitter.call(this, configuration);

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

        if (configuration && configuration.page)
        {
            sensorId = configuration.page.broadcast.channelId.sensorId;

          this.sensorId = ko.observable(sensorId);

        }
        else
          this.sensorId = ko.observable();


        if (configuration && configuration.uiFrameWindow)
        {
            this.hostWin = configuration.uiFrameWindow.parent;
            configuration.uiFrameWindow.addEventListener('message',this.onmessage.bind(this));
        }

         if (configuration.rootVM)
           this.rootVM = configuration.rootVM;

        if (configuration.chart)
            this.chart = configuration.chart;

        // Wait before setting up subscription, otherwise the store handler for the property would kick in
        // when the property is initialized. So we would have a situation where the property is stored again
        // with the same value.

        this.pendingStoreSubscription = {};

        // Holds viewmodel series
        this.series = {};

    }

    GenericVM.prototype = EventEmitter.prototype;
    GenericVM.constructor = EventEmitter;

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
    };



    GenericVM.prototype.getSetting = function (items,isPendingStoreSubscription)
    {

    if (this.sensorId()) {
        this.hostWin.postMessage({  request: 'get', sensorId : this.sensorId(),  items: items },'*'); // Fetch previous location of sensor if available
        if (typeof items === 'string')
        {
            if (isPendingStoreSubscription)
                this.pendingStoreSubscription[items] = true;
        } else if (Array.isArray(items))
        {
            for (var item in items)
                if (isPendingStoreSubscription)
                    this.pendingStoreSubscription[items[item]] = true;
        }
    }
        else
        {
            if (this._logger && this._logger.logging)
                this._logger.log('error','Cannot get settings for',items,'without a sensorId');
        }

    };

    // Subscribe to changes in viewmodel and send a request message for storage
    GenericVM.prototype.subscribeAndStore = function (properties,sensorId)
    {

        var subscribe = function (singleProperty) {

            this[singleProperty].subscribe(function (newValue) {
                var key,
                   items = {};


                key = singleProperty;
                if (sensorId)
                    key += ('-' + sensorId);

                items[key] = newValue;

                this.hostWin.postMessage({
                    request: 'set',
                    items: items
                },'*');

            }.bind(this));
        }.bind(this);

        if (typeof properties === 'string') { // Single property

            subscribe(properties);
        }
        else if (Array.isArray(properties)) // Multiple properties [p1,p2,...]
        {
            for (var prop in properties)
            {

                subscribe(properties[prop]);
            }
        } else
        {
            if (this._logger && this._logger.logging)
                this._logger.log('warn', 'Unable to subscribe to properties of type', typeof properties);
        }

    };

    GenericVM.prototype.updateFromPage = function (page)
    {
        throw new Error('Cannot update page, do not know the viewmodel properties, updateFromPage should be overridden in descandant objcets');
    };

    GenericVM.prototype.addSeries = function (page,seriesOptions)
    {
        var sensorId = page.broadcast.channelId.sensorId;

        for (var series in seriesOptions) {
            seriesOptions[series].name += ' '+sensorId;
            seriesOptions[series].id += sensorId;
            this.series[series] = this.chart.addSeries(seriesOptions[series],false,false);
        }

    };

     GenericVM.prototype.onmessage = function (event)
    {
     var data = event.data,
            page = event.data.page,
            currentSeries = this.series,
            sensorId,
            key,

            index,
            property,
            value;

        // Ignore data without a sensorId or message destination is for another id

        if (!data.sensorId || data.sensorId !== this.sensorId())
            return;

        switch (data.response)
        {
                case 'page' :

                    this.updateFromPage(page);
                    this.addPoint(page);

                    break;

                case 'get' :

                if (typeof data.items === 'object') {

                        for (key in data.items)
                        {

                            index = key.indexOf('-', 0);

                            property = key.substr(0, index);
                            sensorId = key.substring(index + 1);

                             if (data.sensorId !== sensorId)
                             {
                                 if (this._logger && this._logger.logging) this._logger.log('warn', 'Sensor id. in header',data.sensorId,'does not match sensorId in key',sensorId);
                             } else {
                                value = data.items[key];
                                if (value)  // Don't update with undefined
                                {
                                    this[property](value);

                                    if (this.pendingStoreSubscription[property]) {
                                        this.pendingStoreSubscription[property] = false;
                                        this.subscribeAndStore(property,sensorId);
                                    }


                                }
                             }

                        }
                    } else
                    {
                        if (this._logger && this._logger.logging) this._logger.log('warn', data.response+' Unable to process items, expected an object',data.items);
                    }

                   break;

                default :
                    if (this._logger && this._logger.logging) this._logger.log('error', "Don't known what to do with response",data.response);

                break;
     }
    };

    return GenericVM;


});
