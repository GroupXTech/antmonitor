/* global define: true, ko:true */

// Main viewmodel class
define(['logger','profiles/Page','vm/genericVM','converter/temperatureConverter'], function(Logger,GenericPage, GenericVM, TemperatureConverter) {

    'use strict';
    
    function TemperatureVM(configuration) {

        var uiWin,

            sensorId;

        GenericVM.call(this, configuration);

        if (configuration && configuration.uiFrameWindow)
        {
            uiWin = configuration.uiFrameWindow;
            this.hostWin = uiWin.parent;
            uiWin.addEventListener('message',this.onmessage.bind(this));
        }

        if (configuration && configuration.page)
        {
            sensorId = configuration.page.broadcast.channelId.sensorId;

          this.sensorId = ko.observable(sensorId);

           // console.info(Date.now(),"Created TempVM",sensorId);

        }
        else
          this.sensorId = ko.observable();

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

        this.initFromDB();

         if (configuration.rootVM)
        {
            this.rootVM = configuration.rootVM;

            // Subscribe to change in global temperature setting

            this.subscribeToTempChange();
        }


        if (configuration.chart) {
            this.chart = configuration.chart;
            if (configuration.page)
              this.addSeries(configuration.page);
        }


        // Run update on page (must be the last operation -> properties must be defined on viewmodel)
        if (configuration.page)
          this.updateFromPage(configuration.page);


    }
    
     TemperatureVM.prototype = Object.create(GenericVM.prototype);
     TemperatureVM.prototype.constructor = TemperatureVM;
    
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

    // Convert series from/to fahrenheit when user changes setting
    TemperatureVM.prototype.subscribeToTempChange = function ()
    {

        var settingVM = this.rootVM.settingVM;

        settingVM.temperature_fahrenheit.subscribe(function (useFahrenheit) {
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
                                                        }.bind(this));

    };

    TemperatureVM.prototype.initFromDB = function ()
    {

    if (this.sensorId())
            this.hostWin.postMessage({  request: 'get', sensorId : this.sensorId(),  items: 'location' },'*'); // Fetch previous location of sensor if available

    };

    TemperatureVM.prototype.MODE = {
        CELCIUS : 'celcius',
        FAHRENHEIT : 'fahrenheit'
    };
    
     TemperatureVM.prototype.MODES = [TemperatureVM.prototype.MODE.CELCIUS,TemperatureVM.prototype.MODE.FAHRENHEIT];

    // Takes page with current, low/high 24 h and puts it into the viewModel
     TemperatureVM.prototype.updateFromPage = function (page) {

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
            currentSeries = this.series;

        // Ignore data without a sensorId or message destination is for another id

        if (!data.sensorId || data.sensorId !== this.sensorId())
            return;

        console.info(Date.now(),'TempVM',this.sensorId(),'got event',event,data);

        switch (data.response)
        {
                case 'page' :

                    this.updateFromPage(page);

                    break;

                case 'get' :

                   console.info(Date.now(),'TempVM GET',data);
                   break;


        }

    };

    return TemperatureVM;

});
