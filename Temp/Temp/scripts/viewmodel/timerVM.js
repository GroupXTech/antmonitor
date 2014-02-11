define(['converter/timeFormatter'],function _requireDefineTimerVM(TimeFormatter) {

  

    function TimerVM()
    {
        //this.currentTime = ko.observable();
        this.timeFormatter = new TimeFormatter();

        this.totalElapsedTime = ko.observable(0);
        this.lapElapsedTime = ko.observable(0);
        this.lapNr = ko.observable(0);
        this.state = ko.observable();
    }

    TimerVM.prototype.getFormattedTotalElapsedTime = function ()
    {
        return this.timeFormatter.format(this.totalElapsedTime());
    }

    TimerVM.prototype.getFormattedLapElapsedTime = function () {
        return this.timeFormatter.format(this.lapElapsedTime());
    }

    TimerVM.prototype.reset = function ()
    {
        this.totalElapsedTime(0);
        this.lapElapsedTime(0);
    }

    return TimerVM;

});