/* global define: true, ko: true, clearInterval: true, setInterval: true */

define(['converter/timeFormatter','scripts/timer','logger','events'],function _requireDefineTimerVM(TimeFormatter, Timer, Logger, EventEmitter) {

    // Timer model is highly connected to the viewmodel that's interfacing the declarative view in HTML

    function TimerVM(options)
    {
        EventEmitter.call(this,options);

        //this.currentTime = ko.observable();

        // Privates

        this._options = options;
        if (options.rootVM) {
            this.rootVM = options.rootVM;
        }

        this._timeFormatter = new TimeFormatter();
        this._timer = new Timer(options);
        this._logger = options.logger || new Logger(options);
        this._timerID = {
            interval : {}
        };

        // Observabels

        this.totalElapsedTime = ko.observable(0);
        this.lapElapsedTime = ko.observable(0);
        this.lapNr = ko.observable(0);
        this.state = ko.observable();

        // Behaviour/Controller
        // Callbacks from declarative ui binded by knockoutjs, its the root viewmodel (used in ko.applyBindings) thats passed as a viewmodel in the first argument

        this.start = TimerVM.prototype.start.bind(this); // Create new func with our this (binding directly on prototype will bind this to global window object)

        this.stop = TimerVM.prototype.stop.bind(this);

        this.lap = TimerVM.prototype.lap.bind(this);

        this.reset = TimerVM.prototype.reset.bind(this);

        this.init();

    }

    TimerVM.prototype = Object.create(EventEmitter.prototype);
    TimerVM.prototype.constructor = TimerVM;

    TimerVM.prototype.addPlotLine = function (color, time)
    {
        var chart,
            dateTimeAxis,
            sensorChart = this.rootVM.sensorChart;

        if (sensorChart && sensorChart.integrated) {
            chart = sensorChart.integrated.chart;

            dateTimeAxis = chart.get('datetime-axis');
            if (dateTimeAxis) {
                //id = 'plotline-' + rootVM.settingVM.tracking.plotLines.length
                dateTimeAxis.addPlotLine({
                    // id: id,
                    color: color,
                    dashStyle: 'dash',
                    width: 2,
                    value: time
                });

                //   rootVM.settingVM.tracking.plotLines.push(id);

            }
        }
    };

     // Reset sensor viewmodels
   TimerVM.prototype.resetViewModels = function () {

        var sensorDictionary = this.rootVM.getVMdictionary();

        for (var sensorId in sensorDictionary) {
            if (typeof sensorDictionary[sensorId].reset === 'function')
                sensorDictionary[sensorId].reset();

        }
    };

    TimerVM.prototype.removePlotlinesAndSeriesData = function ()
    {
         var viewModel = this.rootVM,
                chart,
                dateTimeAxis,
                seriesNr,
                currentSeries,
                len;

        if (!(viewModel.sensorChart && viewModel.sensorChart.integrated))
            return;

        chart = viewModel.sensorChart.integrated.chart;

        // Remove plot lines

        dateTimeAxis = chart.get('datetime-axis');

        if (dateTimeAxis) {

            dateTimeAxis.removePlotLine(); // undefined id will delete all plotlines (using id === undefined)

        }

        // Remove series data

        for (seriesNr = 0, len = chart.series.length; seriesNr < len; seriesNr++) {

            currentSeries = chart.series[seriesNr];

            currentSeries.setData([], false);
        }

        this.resetViewModels();

    };

    TimerVM.prototype.init = function ()
    {
         this.addListener('stop', function (latestLocalStopTime) {
            this.addPlotLine('red', latestLocalStopTime);
        }.bind(this));

        this.addListener('start', function (latestLocalStartTime) {
            this.addPlotLine('green', latestLocalStartTime);
        }.bind(this));

        this.addListener('lap', function (localLapTime) {
            this.addPlotLine('gray', localLapTime);
        }.bind(this));

        this.addListener('firststart', function () {
            this.resetViewModels();
        }.bind(this));

        this.addListener('reset', function () {
           this.removePlotlinesAndSeriesData();
        }.bind(this));
    };

    TimerVM.prototype.stop = function _stop(viewModel, event) {

        if (!this._timer.stop())
            return;

        clearInterval(this._timerID.interval.updateElapsedTime);

        this.emit('stop', this._timer.getLatestStopTime() + this.rootVM.settingVM.timezoneOffsetInMilliseconds);

    };

    TimerVM.prototype.lap = function _lap(viewModel, event) {

        if (!this._timer.lap())
            return;

        this.lapElapsedTime(0);
        this.lapNr(this._timer.lapTime.length);

        this.emit('lap',this._timer.getLatestLapTime() + this.rootVM.settingVM.timezoneOffsetInMilliseconds);

    };

    TimerVM.prototype.start = function _start(viewModel, event) {


        if (!this._timer.start())
            return;

        this._timerID.interval.updateElapsedTime = setInterval(function () {
            this.totalElapsedTime(this._timer.getTotalElapsedTime());
            this.lapElapsedTime(this._timer.getLapElapsedTime());
        }.bind(this), 1000);

        this.emit('start', this._timer.getLatestStartTime() + this.rootVM.settingVM.timezoneOffsetInMilliseconds);

        //viewModel.ui.addPlotLine('green', this._timer.getLatestStartTime() + viewModel.ui.timezoneOffsetInMilliseconds);

        if (this._timer.event.length === 1 && this._timer.event[0].event === 'start') // Reset all viewmodels on the first start event
            this.emit('firststart');

    };

    TimerVM.prototype.reset = function (viewModel,event) {
        var updateElapsedTimeID = this._timerID.interval.updateElapsedTime;

        if (!this._timer.reset())
            return;

        this.totalElapsedTime(0);
        this.lapElapsedTime(0);

        if (updateElapsedTimeID !== undefined)
            clearInterval(updateElapsedTimeID);

        this.emit('reset');

    };

    TimerVM.prototype.getFormattedTotalElapsedTime = function () {
        return this._timeFormatter.format(this.totalElapsedTime());
    };

    TimerVM.prototype.getFormattedLapElapsedTime = function () {
        return this._timeFormatter.format(this.lapElapsedTime());
    };

    return TimerVM;

});
