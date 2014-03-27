/* global define: true, ko:true */

// Main viewmodel class
define(['logger','profiles/Page','vm/genericVM','converter/temperatureConverter'], function(Logger,GenericPage, GenericVM, TemperatureConverter) {

    'use strict';
    
    function TemperatureVM(configuration) {

        GenericVM.call(this, configuration);

        if (configuration.tempConverter)
            this.tempConverter = configuration.tempConverter; // Shared code
        else
          this.tempConverter = new TemperatureConverter(); // Fallback, if sharing code is not available

        this.temperatureMode = configuration.temperatureMode || ko.observable(TemperatureVM.prototype.MODE.CELCIUS);

        this.number = ko.observable();

        // Current temperature
        this.currentTemp = ko.observable();


        var getFormattedTemp = function (tempObs, toFixedDigits) {

            var formattedTemp;

            if (tempObs() === undefined)
                return '--.--'; // Sensor discovered, but temperature observation not available yet

            switch (this.temperatureMode()) {
                case TemperatureVM.prototype.MODE.FAHRENHEIT:

                    //formattedTemp = (tempObs()*(9/5)+32);
                    formattedTemp = this.tempConverter.fromCelciusToFahrenheit(tempObs()).toFixed(toFixedDigits || 2);

                    break;

                default:

                    formattedTemp = tempObs().toFixed(toFixedDigits || 2);

                    break;
            }

            return formattedTemp;

        }.bind(this);

        this.formattedUnit = ko.computed({

            read: function () {
                var formattedUnit;

                 switch (this.temperatureMode()) {
                        case TemperatureVM.prototype.MODE.FAHRENHEIT:

                            formattedUnit = '°F';
                            break;

                        default:

                            formattedUnit = '°C';
                            break;
                 }

                return formattedUnit;
            }.bind(this)
        });

        this.formattedCurrentTemp = ko.computed({
            read: function () {
                return getFormattedTemp(this.currentTemp, 2);

            }.bind(this)

        });


        this.eventCount = ko.observable();

        // 24 h high
        this.high24H = ko.observable();
        this.formattedHigh24H = ko.computed({
            read: function () {
                return getFormattedTemp(this.high24H, 1) ;

            }.bind(this)

        });

        // 24 h low
        this.low24H = ko.observable();
        this.formattedLow24H = ko.computed({
            read: function () {
                return getFormattedTemp(this.low24H, 1) ;
            }.bind(this)

        });

        this.location = ko.observable();
      

        this.timestamp = ko.observable();
        this.formattedTimestamp = ko.computed({
            read: function () {
                if (this.timestamp)
                    return (new Date(this.timestamp())).toLocaleTimeString();
            }.bind(this)
        });


        this._page = undefined;

        this.init(configuration);


    }
    
     TemperatureVM.prototype = Object.create(GenericVM.prototype);
     TemperatureVM.prototype.constructor = TemperatureVM;
    
    TemperatureVM.prototype.init = function (configuration)
    {
        this.getSetting('location',true);

        // Integration with global temperature setting

        this.rootVM.settingVM.temperature_fahrenheit.subscribe(this.onTemperatureModeChange.bind(this));

        this.addSeries(configuration.page);

        this.updateFromPage(configuration.page); // Run update on page (must be the last operation -> properties must be defined on viewmodel)

    };

    TemperatureVM.prototype.addSeries = function (page)
    {

       var sensorId = page.broadcast.channelId.sensorId;

       this.series = this.chart.addSeries(
            {
                name: this.rootVM.languageVM.temperature().message + ' '+ sensorId,
                id: 'ENVIRONMENT-current-' + sensorId,
                color: 'black',
                data: [], // tuples [timestamp,value]
                type: 'spline',

                //marker : {
                //    enabled : true,
                //    radius : 2
                //},

                yAxis: 0,

                tooltip: {
                    valueDecimals: 2,
                    valueSuffix: ' °'
                }
            }, false, false);
    };

    TemperatureVM.prototype.addPoint = function (page)
    {

        var settingVM = this.rootVM.settingVM;

        // Ignore pages without currentTemp, e.g supported pages from temp. sensor


        if (page.currentTemp === undefined)
           return;

        if (this.temperatureMode && this.temperatureMode() === TemperatureVM.prototype.MODE.FAHRENHEIT) {
            this.series.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, this.tempConverter.fromCelciusToFahrenheit(page.currentTemp)], false, false, false);

        }
        else {

            this.series.addPoint([page.timestamp + settingVM.timezoneOffsetInMilliseconds, page.currentTemp], false, false, false);

        }

    };

    TemperatureVM.prototype.onTemperatureModeChange = function (useFahrenheit)
    {

        var newSeriesData = [],
            tempMeasurementNr,
            len;

          if (useFahrenheit)
            {
                this.temperatureMode(TemperatureVM.prototype.MODE.FAHRENHEIT);

                  for (tempMeasurementNr=0, len = this.series.xData.length; tempMeasurementNr < len; tempMeasurementNr++)
                  {
                        newSeriesData.push([this.series.xData[tempMeasurementNr],this.tempConverter.fromCelciusToFahrenheit(this.series.yData[tempMeasurementNr])]);
                  }


            }
            else {

               this.temperatureMode(TemperatureVM.prototype.MODE.CELCIUS);
                 for (tempMeasurementNr=0, len = this.series.xData.length; tempMeasurementNr < len; tempMeasurementNr++)
                  {
                        newSeriesData.push([this.series.xData[tempMeasurementNr],this.tempConverter.fromFahrenheitToCelcius(this.series.yData[tempMeasurementNr])]);
                  }
            }

            this.series.setData(newSeriesData,true);
    };




    TemperatureVM.prototype.MODE = {
        CELCIUS : 'celcius',
        FAHRENHEIT : 'fahrenheit'
    };
    
     TemperatureVM.prototype.MODES = [TemperatureVM.prototype.MODE.CELCIUS,TemperatureVM.prototype.MODE.FAHRENHEIT];

    // Takes page with current, low/high 24 h and puts it into the viewModel
     TemperatureVM.prototype.updateFromPage = function (page) {

         if (!page)
         {
             if (this._logger && this._logger.logging)
                 this._logger.log('warn','Cannot update viewmodel with an undefined page');
             return;
         }

         // For debugging, i.e inspect broadcast data
         this._page = page;

         // Update view model

         if (page.broadcast && page.broadcast.channelId)
             this.sensorId(page.broadcast.channelId.sensorId);

         if (page.number !== undefined)
             this.number(page.number);

         if (page.currentTemp)
             this.currentTemp(page.currentTemp);

         if (page.hour24Low)
             this.low24H(page.hour24Low);

         if (page.hour24High)
             this.high24H(page.hour24High);

         if (page.timestamp)
             this.timestamp(page.timestamp);

        // if ((page.profile && page.profile.hasCommonPages) || !page.profile)
             this.updateCommonPage(page);

         this.addPoint(page);
     };
     
    TemperatureVM.prototype.getTemplateName = function (item)
    {
       // return undefined;
         return "environment-template";
    };

    TemperatureVM.prototype.reset = function ()
    {
        this.sensorId(undefined);
        this.number(undefined);
        this.currentTemp(undefined);
        this.low24H(undefined);
        this.high24H(undefined);
        this.timestamp(undefined);
    };

    TemperatureVM.prototype.onmessage = function (event)
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

        //console.info(Date.now(),'TempVM',this.sensorId(),'got event',event,data);

        switch (data.response)
        {
                case 'page' :

                    this.updateFromPage(page);

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

        }

    };

    return TemperatureVM;

});
