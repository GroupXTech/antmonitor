define(['scripts/resource/language','logger'], function _defineLanguageVM(resource,Logger) {

    'use strict';

    function LanguageVM(configuration) {
        this.logger = new Logger(configuration);
        this.language = ko.observable(this.getLanguage());
        this.defaultLanguage = 'en';

        if (this.logger && this.logger.logging)
            this.logger.log('info', 'Navigator language', this.language());
        // Chrome : 'nb', IE 11/Win app : 'nb-NO'

        this.temperature = ko.computed(function () { // Dependent observable
            return this.getMessage('temperature');
        }.bind(this));

        this.heartrate = ko.computed(function () {
            return this.getMessage('heartrate');
        }.bind(this));

        this.speed = ko.computed(function () {
            return this.getMessage('speed');
        }.bind(this));

        this.cadence = ko.computed(function () {
            return this.getMessage('cadence');
        }.bind(this));


        this.sensors = ko.computed(function () {
            return this.getMessage('sensors');
        }.bind(this));

        this.temperature_overview = ko.computed(function () {
            return this.getMessage('temperature_overview');
        }.bind(this));

        this.hrm_overview = ko.computed(function () {
            return this.getMessage('hrm_overview');
        }.bind(this));

        this.spdcad_overview = ko.computed(function () {
            return this.getMessage('spdcad_overview');
        }.bind(this));

        this.about_part1 = ko.computed(function () {
            return this.getMessage('about_part1');
        }.bind(this));

        //this.about_part2 = ko.computed(function () {
        //    return this.getMessage('about_part2');
        //}.bind(this));

        this.about_part3 = ko.computed(function () {
            return this.getMessage('about_part3');
        }.bind(this));

        this.about_part4 = ko.computed(function () {
            return this.getMessage('about_part4');
        }.bind(this));

        this.libraries = ko.computed(function () {
            return this.getMessage('libraries');
        }.bind(this));

        this.icons = ko.computed(function () {
            return this.getMessage('icons');
        }.bind(this));

        this.speedandcadence = ko.computed(function () {
            return this.getMessage('speedandcadence');
        }.bind(this));

        this.background = ko.computed(function () {
            return this.getMessage('background');
        }.bind(this));

        this.ant_monitor = ko.computed(function () {
            return this.getMessage('ant_monitor');
        }.bind(this));

        this.minimum = ko.computed(function () {
            return this.getMessage('minimum');
        }.bind(this));


        this.maximum = ko.computed(function () {
            return this.getMessage('maximum');
        }.bind(this));

        this.location = ko.computed(function () {
            return this.getMessage('location');
        }.bind(this));

        this.bpm = ko.computed(function () {

           return this.getMessage('bpm');
         
        }.bind(this));

    };

    LanguageVM.prototype.getLanguage = function () {
        return window.navigator.language;
    };

    LanguageVM.prototype.getMessage = function (msg) {
        var resourceAvailable,
            currentLang = this.language();

        if (msg === undefined) {
            if (this.logger && this.logger.logging)
                this.logger.error('Attempt to get a undefined message identifier');
            return;
        }

        resourceAvailable = resource[currentLang]; // i.e nb-NO

        if (!resourceAvailable)
            resourceAvailable = resource[currentLang.substr(0, 2)]; // i.e nb

        // Fallback to default language 

        if (!resourceAvailable)
            resourceAvailable = resource[this.defaultLanguage];

        if (resourceAvailable ) {
            
            if (resourceAvailable[msg])
                return resourceAvailable[msg];
            else { // Fallback to default language
                resourceAvailable = resource[this.defaultLanguage];
                return resourceAvailable[msg];
            }
        } 
    };
          

    return LanguageVM;
});