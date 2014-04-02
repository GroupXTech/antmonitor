/* global define: true, ko: true, window: true */

// Generic viewmodel, for ANT+ common pages 80 81 82
define(['logger', 'profiles/Page','events'], function (Logger, GenericPage,EventEmitter) {
    'use strict';

    function GenericVM(configuration) {

        EventEmitter.call(this, configuration);

        // this._logger = new Logger(configuration);
        this._logger = configuration.logger || new Logger(configuration); // Use a configured logger, or create a new one

        this.name = ko.observable();

        this.ownSensor = ko.observable(false); // Is this sensor users own sensor or others?

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
          this.sensorId = ko.observable( configuration.page.broadcast.channelId.sensorId);
        else if (configuration && configuration.sensorId)
          this.sensorId = ko.observable(configuration.sensorId);
        else {
          this.sensorId = ko.observable();
          if (this._logger.logging)
            this._logger.log('error','All viewmodels inheriting from genericVM should have a unique sensorId');
        }

        this.hostWin = window.parent;
        window.addEventListener('message',this.onmessage.bind(this));

         if (configuration.rootVM) {
           this.rootVM = configuration.rootVM;
           this.chart = configuration.rootVM.sensorChart.integrated.chart;

         }

        // Wait before setting up subscription, otherwise the store handler for the property would kick in
        // when the property is initialized. So we would have a situation where the property is stored again
        // with the same value.

        this.pendingStoreSubscription = {};

        // Holds viewmodel series
        this.series = {};

        this.getSetting(['name-'+this.sensorId(),'ownSensor-'+this.sensorId()],true);

    }

    GenericVM.prototype = Object.create(EventEmitter.prototype);
    GenericVM.prototype.constructor = EventEmitter;

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



    // items = string || array
    GenericVM.prototype.getSetting = function (items,isPendingStoreSubscription)
    {

    this.hostWin.postMessage({  request: 'get', sensorId : this.sensorId(),  items: items },'*');

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


    };

    // Subscribe to changes in viewmodel and send a request message for storage
    // Optional parameter sensorId for a particular sensor
    GenericVM.prototype.subscribeAndStore = function (property,sensorId)
    {

        var subscribe = function _subscribe(singleProperty) {

            var store = function _storeKey(newValue) {

                var key,
                   items = {};

                key = singleProperty+'-'+sensorId;

                items[key] = newValue;

                this.hostWin.postMessage({
                    request: 'set',
                    items: items
                },'*');

            };

            if (this._logger && this._logger.logging)
                this._logger.log('log','Storage subscription to property '+singleProperty+' on viewmodel',this);

            this[singleProperty].subscribe(store.bind(this));

        }.bind(this);

        if (typeof property === 'string') { // Single property

            subscribe(property);
        }
       // else if (Array.isArray(properties)) // Multiple properties [p1,p2,...]
       // {
       //     for (var prop in properties)
       //     {

       //         subscribe(properties[prop]);
       //     }
       // }
        else
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

    GenericVM.prototype.updateFromStorage = function (data,key)
    {
    var index = key.indexOf('-', 0),
        property,
        sensorId,
        value;


        if (index !== -1) {

           property = key.substr(0, index);
          sensorId = key.substring(index + 1);
        }
        else {
           if (this._logger && this._logger.logging)
           this._logger.log('error','Did not find - delemiter in key, wrong key (format property-sensorid)',key);
        }

        value = data.items[key]; // Contains result

        if (value !== undefined) {
            if (this._logger && this._logger.logging)
              this._logger.log('log','Updating property '+property+' with value',value,'on viewmodel',this);

            this[property](value);

        } else {
            if (this._logger && this._logger.logging)
              this._logger.log('log','Refused updating property '+property+' with value',value,'on viewmodel',this);
        }


        if (this.pendingStoreSubscription[key]) {
            this.pendingStoreSubscription[key] = false;
            this.subscribeAndStore(property,sensorId);
        }

    };

     GenericVM.prototype.onmessage = function (event)
    {
     var data = event.data,
            page = event.data.page,
            currentSeries = this.series,
         key,
         itemNr,
         len;

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

                    if (Array.isArray(data.requestitems)) {

                        for (itemNr=0, len=data.requestitems.length; itemNr < len; itemNr++)
                           this.updateFromStorage(data,data.requestitems[itemNr]);
}
                    else if (typeof data.requestitems === 'string')
                          this.updateFromStorage(data,data.requestitems);
                    else
                    {
                        if (this._logger && this._logger.logging) this._logger.log('warn', data.response+' Unable to process items, expected an object or string',data.requestitems);
                    }

                   break;

                default :
                    if (this._logger && this._logger.logging) this._logger.log('error', "Don't known what to do with response",data.response);

                break;
     }
    };

    return GenericVM;


});
