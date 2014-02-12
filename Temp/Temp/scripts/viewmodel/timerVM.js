define(['converter/timeFormatter','scripts/timer','logger'],function _requireDefineTimerVM(TimeFormatter, Timer, Logger) {

  
    // Timer model is highly connected to the viewmodel that's interfacing the declarative view in HTML
    function TimerVM(options)
    {
        //this.currentTime = ko.observable();

        // Privates

        this._timeFormatter = new TimeFormatter();
        this._timer = new Timer(options);
        this._logger = new Logger(options)
        this._timerID = {
            interval : {}
        };

        // Observabels
         
        this.totalElapsedTime = ko.observable(0);
        this.lapElapsedTime = ko.observable(0);
        this.lapNr = ko.observable(0);
        this.state = ko.observable();

        // Behaviour/Controller
        // Callbacks from declarative ui binded by knockoutjs, its the root viewmodel thats passed as a viewmodel in the first argument

        this.start = TimerVM.prototype.start.bind(this);

        this.stop = TimerVM.prototype.stop.bind(this);

        this.lap = TimerVM.prototype.lap.bind(this);

        this.reset = TimerVM.prototype.reset.bind(this);
    }

    TimerVM.prototype.stop = function _stop(viewModel, event) {

        if (!this._timer.stop())
            return;

        clearInterval(this._timerID.interval['updateElapsedTime']);

        viewModel.ui.addPlotLine('red', this._timer.getLatestStopTime() + viewModel.ui.timezoneOffsetInMilliseconds);

    };

    TimerVM.prototype.lap = function _lap(viewModel, event) {

        if (!this._timer.lap())
            return;

        this.lapElapsedTime(0);
        this.lapNr(this._timer.lapTime.length);

        viewModel.ui.addPlotLine('gray', this._timer.getLatestLapTime() + viewModel.ui.timezoneOffsetInMilliseconds);
    };

   
    TimerVM.prototype.start = function _start(viewModel, event) {


        if (!this._timer.start())
            return;

        this._timerID.interval['updateElapsedTime'] = setInterval(function () {
            this.totalElapsedTime(this._timer.getTotalElapsedTime());
            this.lapElapsedTime(this._timer.getLapElapsedTime());
        }.bind(this), 1000);

        viewModel.ui.addPlotLine('green', this._timer.getLatestStartTime() + viewModel.ui.timezoneOffsetInMilliseconds);

    };

    TimerVM.prototype.reset = function (viewModel,event) {
        var currentSeries,
           seriesNr,
           len,
           chart,
           dateTimeAxis;

        if (!this._timer.reset())
            return;

        if (viewModel.sensorChart && viewModel.sensorChart.integrated) {

            this.totalElapsedTime(0);
            this.lapElapsedTime(0);
               
            clearInterval(this._timerID.interval['updateElapsedTime']);

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

        }

    };

    TimerVM.prototype.getFormattedTotalElapsedTime = function () {
        return this._timeFormatter.format(this.totalElapsedTime());
    };

    TimerVM.prototype.getFormattedLapElapsedTime = function () {
        return this._timeFormatter.format(this.lapElapsedTime());
    };

    return TimerVM;

});