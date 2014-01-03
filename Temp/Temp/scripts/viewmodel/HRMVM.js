/* global define: true */

// Main viewmodel class
define(['require', 'module', 'exports', 'logger', 'profiles/Page', 'vm/genericVM'], function (require, module, exports, Logger, GenericPage, GenericVM) {
    'use strict';

    function HRMVM(configuration) {

        GenericVM.call(this, configuration);

        this.timestamp = ko.observable();

        this.formattedTimestamp = ko.computed({
            read: function () {
                if (this.timestamp)
                    return (new Date(this.timestamp())).toLocaleTimeString();
            }.bind(this)
        })

        this._page = undefined;
        
        // HRM page 4 
        
        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = ko.observable();
    
        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = ko.observable();
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = ko.observable();
        
        this.previousHeartBeatEventTime = ko.observable();
        
        this.RRInterval = ko.observable();
//
//
//        // SDM page 1
//
//        this.time = ko.observable();
//
//        this.distance = ko.observable();
//        
//        this.speed = ko.observable();
//
//        this.strideCount = ko.observable();
//
//        this.updateLatency = ko.observable();
//
//        // SDM page 2
//
//        this.cadence = ko.observable();
//        this.formattedCadence = ko.computed({
//            read: function () {
//                if (this.cadence() !== undefined)
//                    return this.cadence().toFixed(1);
//                else
//                    return '-';
//
//            }.bind(this)
//        });
//
//        this.status = {};
//
//        this.status.UseState = ko.observable();
//        this.status.UseStateFriendly = ko.observable();
//        this.status.SDMHealthFriendly = ko.observable();
//        this.status.SDMLocationFriendly = ko.observable();
//
//        // Additional properties based on pages
//
//        this.cumulativeStrides = ko.observable(0);
//
//        this.cumulativeDistance = ko.observable(0);
//
//        // Distance mode metric/mile
//        this.distanceMode = ko.observable(HRMVM.prototype.DISTANCE_MODE.METRIC);
//
//
//        this.formattedCumulativeDistance = ko.computed({
//            read: function () {
//                var distStr = '-';
//
//                if (this.cumulativeDistance() !== undefined) {
//                    switch (this.distanceMode()) {
//
//                        case HRMVM.prototype.DISTANCE_MODE.MILE_INTERNATIONAL:
//
//                            distStr = (this.cumulativeDistance() / HRMVM.prototype.CONVERSION_FACTOR.INTERNATIONAL).toFixed(1);
//
//                            break;
//
//                        default:
//
//                            distStr = this.cumulativeDistance().toFixed(1);
//                            break;
//                    }
//                }
//
//                return distStr;
//
//            }.bind(this)
//        });
//
//        this.speedMode = ko.observable(HRMVM.prototype.SPEED_MODE.TEMPO);
//
//        this.formattedSpeed = ko.computed({
//            read: function () {
//                var speedStr = '-', speed = this.speed();
//
//                if (speed !== undefined) {
//                    switch (this.speedMode()) {
//
//                        //case HRMVM.prototype.SPEED_MODE.TEMPO:
//
//                        //    break;
//
//                        default:
//
//                            speedStr = this.speed().toFixed(1);
//                            break;
//                    }
//                }
//
//                return speedStr;
//
//            }.bind(this)
//        });
//
//       

    }

    HRMVM.prototype = Object.create(GenericVM.prototype);
    HRMVM.prototype.constructor = HRMVM;

    HRMVM.prototype.INVALID_HR = 0x00;
    
   
    HRMVM.prototype.updateFromPage = function (page) {
        
        this._page = page;
        
        // HRM Page 4
        
         // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        if (page.heartBeatEventTime)
            this.heartBeatEventTime(page.heartBeatEventTime);
    
        // Counter for each heart beat event, rollover 255 counts
        if (page.heartBeatCount)
            this.heartBeatCount(page.heartBeatCount);
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        if (page.computedHeartRate)
            this.computedHeartRate(page.computedHeartRate);
        
        if (page.previousHeartBeatEventTime)
            this.previousHeartBeatEventTime(page.previousHeartBeatEventTime);
        
        if (page.RRInterval)
            this.RRInterval(page.RRInterval);

//        var timestampDifference,
//            distanceDifference,
//            strideCountDifference,
//            TIME_ROLLOVER_LIMIT = 256000,// ms
//            STRIDE_COUNT_ROLLOVER = 256, // counts
//            DISTANCE_ROLLOVER = 256,
//            TIME_NOT_ROLLOVER;
//
//        // For debugging, i.e inspect broadcast data
//        this._page = page;
//
//        // Update view model
//
//        if (page.timestamp) {
//            this._previousTimestamp = this.timestamp();
//            this.timestamp(page.timestamp);
//            if (this._previousTimestamp)
//                timestampDifference = page.timestamp - this._previousTimestamp;
//            if (timestampDifference !== undefined && timestampDifference <= TIME_ROLLOVER_LIMIT)
//                TIME_NOT_ROLLOVER = true;
//            else
//                TIME_NOT_ROLLOVER = false;
//        }
//           
//
//        // SDM page 1 
//
//        // Roll over each 256 seconds
//        if (page.time !== undefined)
//            this.time(page.time);
//
//       
//        if (page.strideCount !== undefined) {
//            this._previousStrideCount = this.strideCount();
//            this.strideCount(page.strideCount);
//
//            // Compute cumulativ strides if no time rollover
//            if (TIME_NOT_ROLLOVER) {
//                if (this._previousStrideCount) {
//                    strideCountDifference = page.strideCount - this._previousStrideCount;
//                    if (strideCountDifference < 0)
//                        strideCountDifference += STRIDE_COUNT_ROLLOVER;
//
//                    this.cumulativeStrides(this.cumulativeStrides()+strideCountDifference);
//                }
//            }
//                
//        }
//            
//
//        if (page.updateLatency !== undefined)
//            this.updateLatency(page.updateLatency);
//
//
//        if (page.speed !== undefined)
//            this.speed(page.speed);
//
//
//        if (page.distance !== undefined) {
//            this._previousDistance = this.distance();
//            this.distance(page.distance);
//
//            // Compute cumulativ distance if no time rollover
//            if (TIME_NOT_ROLLOVER) {
//                if (this._previousDistance) {
//                    distanceDifference = page.distance - this._previousDistance;
//                    if (distanceDifference < 0)
//                        distanceDifference += DISTANCE_ROLLOVER;
//
//                    this.cumulativeDistance(this.cumulativeDistance() + distanceDifference);
//                }
//            } 
//
//        }
//
//
//        // SDM page 2
//
//        // Speed same as SDM page 1
//        if (page.cadence !== undefined)
//            this.cadence(page.cadence);
//
//
//        if (page.status && page.status.UseState !== undefined)
//            this.status.UseState(page.status.UseState);
//
//        if (page.status && page.status.UseStateFriendly !== undefined)
//            this.status.UseStateFriendly(page.status.UseStateFriendly);
//
//        if (page.status && page.status.SDMHealthFriendly !== undefined)
//            this.status.SDMHealthFriendly(page.status.SDMHealthFriendly);
//
//        if (page.status && page.status.SDMLocationFriendly !== undefined)
//            this.status.SDMLocationFriendly(page.status.SDMLocationFriendly);
//
//        this.updateCommonPage(page);
    };

    HRMVM.prototype.getTemplateName = function (item) {
        // return undefined;
        return "HRM-template";
    };

    module.exports = HRMVM;
    return module.exports;
});