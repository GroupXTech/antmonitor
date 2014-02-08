define(['logger'],function _requireDefineTimer(Logger) {

    function Timer(options) {

        this.logger = new Logger(options.log);

        // Pro : More control of get/set operations 
        // Con: More elaborate setup of property and introduces another "private" property, performance degradation?
        Object.defineProperty(this, "elapsedTime",
                            {
                                get: function () {
                                    if (this.logger && this.logger.logging)
                                        this.logger.log('log', 'Timer elapsed time - get -', this._elapsedTime);

                                    return this._elapsedTime;
                                },
                                set: function (newValue) {
                          
                                    this._elapsedTime = newValue;

                                    if (this.logger && this.logger.logging)
                                        this.logger.log('log', 'Timer elapsed time  - set -', this._elapsedTime);
                                }
                            });

        this.elapsedTime = 0;

        this.startTime = [];
        this.stopTime = [];
        this.lapTime = [];

        this.state = this.STATE.INIT;
    }

    Timer.prototype.start = function () {

        var startTime = Date.now();

        if (!(this.state === Timer.prototype.STATE.INIT) || !(this.state === Timer.prototype.STATE.STOPPED))
            return;

        this.startTime.push(startTime);
        
        this.state = Timer.prototype.STATE.STARTED;

        if (this.logger && this.logger.logging)
            this.logger("log", "Timer STARTED", startTime);
    }

    Timer.prototype.stop = function () {

        var stopTime = Date.now(),
            lastStartTime = this.startTime[this.startTime.length - 1];
           
        if (!(this.state === Timer.prototype.STARTED))
            return;

        this.stopTime.push(stopTime);

        this.elapsedTime += (stopTime - lastStartTime);

        this.state = Timer.prototype.STATE.STOPPED;

        if (this.logger && this.logger.logging)
            this.logger("log", "Timer STOPPED", stopTime);
        

    }

    Timer.prototype.getLapElapsedTime = function ()
    {
        if (!(this.state === Timer.prototype.STATE.STARTED))
            return;

        var now = Date.now();
        lastLapTime = this.lapTime[this.lapTime.length - 1];

        if (!lastLapTime)
            lastLapTime = this.startTime[0];

        return now - lastLapTime;
    }

    Timer.prototype.lap = function () {
        var lapTime = Date.now();

        if (!(this.state === Timer.prototype.STATE.STARTED))
            return;

        this.lapTime.push(lapTime);

        if (this.logger && this.logger.logging)
            this.logger("log", "Timer LAP", lapTime);

    }

    Timer.prototype.reset = function () {

        var resetTime = Date.now();

        if (!this.state === Timer.prototype.STOPPED)
            return;

        this.state = Timer.prototype.STATE.INIT;

        // Make previous data available for GC
        this.startTime = [];
        this.stopTime = [];
        this.lapTime = [];

        if (this.logger && this.logger.logging)
            this.logger("log", "Timer RESET", resetTime);
    }

    Timer.prototype.STATE = {
        INIT: 0,
        STARTED: 1,
        STOPPED : 2
    }

    return Timer;
});