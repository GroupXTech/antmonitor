define(['logger'],function _requireDefineTimer(Logger) {
    'use strict';

    // Timer - UTC time - remember to add timezone offset for UI
    function Timer(options) {

        this.logger = new Logger(options);

        // Pro : More control of get/set operations 
        // Con: More elaborate setup of property and introduces another "private" property, performance degradation?
        Object.defineProperty(this, "totalElapsedTime",
                            {
                                get: function () {
                                    if (this.logger && this.logger.logging)
                                        this.logger.log('log', 'Timer total elapsed time - get -', this._totalElapsedTime);

                                    return this._totalElapsedTime;
                                },
                                set: function (newValue) {

                                    this._totalElapsedTime = newValue;

                                    if (this.logger && this.logger.logging)
                                        this.logger.log('log', 'Timer ttotal elapsed time  - set -', this._totalElapsedTime);
                                }
                            });

        this.totalElapsedTime = 0;

        this.lapElapsedTime = 0;

        this.startTime = [];
        this.stopTime = [];
        this.lapTime = [];

        Object.defineProperty(this, "state",
                           {
                               get: function () {
                                   //if (this.logger && this.logger.logging)
                                   //    this.logger.log('log', 'Timer state - get -', Timer.prototype.STATE[this._state]);

                                   return this._state;
                               },

                               set: function (newValue) {

                                   var oldState = this._state;

                                   this._state = newValue;

                                   //if (this.logger && this.logger.logging)
                                   //    this.logger.log('log', 'Timer state change - set -', Timer.prototype.STATE[oldState] + ' -> ' + Timer.prototype.STATE[this._state]);
                               }
                           });


        this.event = [];

        this.state = this.STATE.INIT;
    }

    Timer.prototype.getLatestStartTime = function ()
    {
        return this.startTime[this.startTime.length - 1];
    }

    Timer.prototype.getLatestStopTime = function ()
    {
        return this.stopTime[this.stopTime.length - 1];
    }

    Timer.prototype.getLatestLapTime = function () {
        return this.lapTime[this.lapTime.length - 1];
    }

    Timer.prototype.start = function () {

        var startTime = Date.now(),
            state = this.state;

        if (!(state === Timer.prototype.STATE.INIT || state === Timer.prototype.STATE.STOPPED))
            return false;

        this.event.push({ event: 'start', timestamp: startTime });
        this.startTime.push(startTime);
      
        this.state = Timer.prototype.STATE.STARTED;

        if (this.logger && this.logger.logging)
            this.logger.log("log", "Timer STARTED", startTime);

        return true;
    }

    Timer.prototype.stop = function () {

        var stopTime = Date.now(),
            lastStartTime = this.startTime[this.startTime.length - 1],
            lastEvent = this.event[this.event.length - 1];

        if (this.state !== Timer.prototype.STATE.STARTED)
            return false;

        this.event.push({ event: 'stop', timestamp: stopTime });
        this.stopTime.push(stopTime);
        
        this.totalElapsedTime += (stopTime - lastStartTime);
        this.lapElapsedTime += (stopTime - lastEvent.timestamp); // Either a start or lap event may preceede stop

        this.state = Timer.prototype.STATE.STOPPED;

        if (this.logger && this.logger.logging)
            this.logger.log("log", "Timer STOPPED", stopTime);

        return true;


    }

    Timer.prototype.getTotalElapsedTime = function ()
    {
        var currentTime = Date.now(),
           lastStartTime = this.startTime[this.startTime.length - 1];
          
        if (this.state === Timer.prototype.STATE.STOPPED)
            return this.totalElapsedTime;

        else if (this.state === Timer.prototype.STATE.STARTED) {
          
            return this.totalElapsedTime + (currentTime - lastStartTime);
            
        }
    }

    Timer.prototype.getLapElapsedTime = function () {

        var currentTime = Date.now(),
            lastEvent = this.event[this.event.length - 1];
       
        if (this.state === Timer.prototype.STATE.STARTED) {
         
            return this.lapElapsedTime + (currentTime - lastEvent.timestamp);
        }
        else
            if (this.state === Timer.prototype.STATE.STOPPED)
                return this.lapElapsedTime;

    }

    Timer.prototype.lap = function () {
        var lapTime = Date.now(),
            lastLapTime = this.lapTime[this.lapTime.length - 1];

        if (this.state !== Timer.prototype.STATE.STARTED)
            return false;

        this.event.push({ event: 'lap', timestamp: lapTime });
        this.lapTime.push(lapTime);

        this.lapElapsedTime = 0;

        if (this.logger && this.logger.logging)
            this.logger.log("log", "Timer LAP", lapTime, 'elapsed', lapTime - lastLapTime);

        return true;
    }

    Timer.prototype.reset = function () {

        if (this.state === Timer.prototype.STATE.INIT) // Timer not used yet
            return true;

        var resetTime = Date.now();

        if (this.state !== Timer.prototype.STATE.STOPPED)
            return false;

        this.state = Timer.prototype.STATE.INIT;

        this.totalElapsedTime = 0;
        this.lapElapsedTime = 0;
      
        // Make previous data available for GC

        this.startTime = [];
        this.stopTime = [];
        this.lapTime = [];
        this.event = [];

        if (this.logger && this.logger.logging)
            this.logger.log("log", "Timer RESET", resetTime);

        return true;
    }

    Timer.prototype.STATE = {

        0: 'INIT',
        INIT: 0,

        1: 'STARTED',
        STARTED: 1,

        2: 'STOPPED',
        STOPPED: 2
    }

    Timer.prototype.toString = function ()
    {
        return 'Timer state ' + Timer.prototype.STATE[this.state];
    }

    return Timer;
});