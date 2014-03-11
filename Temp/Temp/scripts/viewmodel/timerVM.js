define(['converter/timeFormatter','scripts/timer','logger','events'],function _requireDefineTimerVM(TimeFormatter, Timer, Logger, EventEmitter) {

  
    // Timer model is highly connected to the viewmodel that's interfacing the declarative view in HTML
    function TimerVM(options)
    {
        EventEmitter.call(this);

        //this.currentTime = ko.observable();

        // Privates

        this._options = options;
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
        // Callbacks from declarative ui binded by knockoutjs, its the root viewmodel (used in ko.applyBindings) thats passed as a viewmodel in the first argument
        
        this.start = TimerVM.prototype.start.bind(this); // Create new func with our this (binding directly on prototype will bind this to global window object)

        this.stop = TimerVM.prototype.stop.bind(this);

        this.lap = TimerVM.prototype.lap.bind(this);

        this.reset = TimerVM.prototype.reset.bind(this);
       
    }

    TimerVM.prototype = EventEmitter.prototype;
    TimerVM.constructor = TimerVM;

    TimerVM.prototype.stop = function _stop(viewModel, event) {

        if (!this._timer.stop())
            return;

        clearInterval(this._timerID.interval['updateElapsedTime']);

        this.emit('stop', this._timer.getLatestStopTime() + this._options.timezoneOffsetInMilliseconds);

        //viewModel.ui.addPlotLine('red', this._timer.getLatestStopTime() + viewModel.ui.timezoneOffsetInMilliseconds);

    };

    TimerVM.prototype.lap = function _lap(viewModel, event) {

        if (!this._timer.lap())
            return;

        this.lapElapsedTime(0);
        this.lapNr(this._timer.lapTime.length);

        this.emit('lap',this._timer.getLatestLapTime() + this._options.timezoneOffsetInMilliseconds)

        
    };

   
    TimerVM.prototype.start = function _start(viewModel, event) {


        if (!this._timer.start())
            return;

        this._timerID.interval['updateElapsedTime'] = setInterval(function () {
            this.totalElapsedTime(this._timer.getTotalElapsedTime());
            this.lapElapsedTime(this._timer.getLapElapsedTime());
        }.bind(this), 1000);

        this.emit('start', this._timer.getLatestStartTime() + this._options.timezoneOffsetInMilliseconds);

        //viewModel.ui.addPlotLine('green', this._timer.getLatestStartTime() + viewModel.ui.timezoneOffsetInMilliseconds);

        if (this._timer.event.length === 1 && this._timer.event[0].event === 'start') // Reset all viewmodels on the first start event
            this.emit('firststart');

    };

    

    TimerVM.prototype.reset = function (viewModel,event) {
        var 
           updateElapsedTimeID = this._timerID.interval['updateElapsedTime'];

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