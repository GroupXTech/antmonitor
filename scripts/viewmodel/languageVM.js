/* global ko: true, define: true, window: true */

define(['scripts/resource/language','logger'], function _defineLanguageVM(resource,Logger) {

    'use strict';

    function LanguageVM(configuration) {

        this.logger = configuration.logger || new Logger(configuration);
        this.language = ko.observable(this.getLanguage());

        this.defaultLanguage = 'en';

        if (this.logger && this.logger.logging)
        {
            this.logger.log('info', 'Navigator language', this.language());
        }

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

        this.power = ko.computed(function () {
            return this.getMessage('power');
        }.bind(this));


        this.anchor_sensors = ko.computed(function () {
            return this.getMessage('anchor_sensors');
        }.bind(this));

        this.anchor_settings = ko.computed(function () {
            return this.getMessage('anchor_settings');
        }.bind(this));

        this.temperature_overview = ko.computed(function () {
            return this.getMessage('temperature_overview');
        }.bind(this));

        this.bike_power_overview = ko.computed(function () {
            return this.getMessage('bike_power_overview');
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

        this.about_licence_label = ko.computed(function () {
            return this.getMessage('about_licence_label');
        }.bind(this));

         this.about_licence_noncommercial = ko.computed(function () {
            return this.getMessage('about_licence_noncommercial');
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



          this.timer_start = ko.computed(function () {

           return this.getMessage('timer_start');

        }.bind(this));

        this.timer_stop = ko.computed(function () {

           return this.getMessage('timer_stop');

        }.bind(this));

         this.timer_lap = ko.computed(function () {

           return this.getMessage('timer_lap');

        }.bind(this));

         this.timer_reset = ko.computed(function () {

           return this.getMessage('timer_reset');

        }.bind(this));

         this.timer_total_elapsed_time = ko.computed(function () {

           return this.getMessage('timer_total_elapsed_time');

        }.bind(this));

         this.timer_lap_time = ko.computed(function () {

           return this.getMessage('timer_lap_time');

        }.bind(this));

        this.unit_power = ko.computed(function () {
            return this.getMessage('unit_power');
        }.bind(this));

        this.unit_cadence = ko.computed(function () {
            return this.getMessage('unit_cadence');
        }.bind(this));

         this.unit_bpm = ko.computed(function () {

           return this.getMessage('unit_bpm');

        }.bind(this));

       this.unit_km_pr_h = ko.computed(function () {

           return this.getMessage('unit_km_pr_h');

       }.bind(this));

       this.unit_mph = ko.computed(function () {

           return this.getMessage('unit_mph');

       }.bind(this));

        // SPDCAD

        this.spdcad_wheel_circumference = ko.computed(function () {

            return this.getMessage('spdcad_wheel_circumference');
        }.bind(this));

        // Settings

        this.setting_distance_mile = ko.computed(function () {

            return this.getMessage('setting_distance_mile');
        }.bind(this));

        this.setting_background_page_info = ko.computed(function () {

            return this.getMessage('setting_background_page_info');
        }.bind(this));

         this.setting_temperature_fahrenheit = ko.computed(function () {

            return this.getMessage('setting_temperature_fahrenheit');
        }.bind(this));
    }

    LanguageVM.prototype.getLanguage = function () {
        return window.navigator.language;
    };

    LanguageVM.prototype.getMessage = function (msg) {
        var resourceAvailable,
            currentLang = this.language();

        if (msg === undefined) {
            if (this.logger && this.logger.logging)
            {
                this.logger.error('Attempt to get a undefined message identifier');
            }
                return;
        }

        resourceAvailable = resource[currentLang]; // i.e nb-NO

        if (!resourceAvailable && currentLang)
        {
            resourceAvailable = resource[currentLang.substr(0, 2)]; // i.e nb
        }
        // Fallback to default language

        if (!resourceAvailable)
        {
            resourceAvailable = resource[this.defaultLanguage];
        }

        if (resourceAvailable ) {

            if (resourceAvailable[msg])
            {
                return resourceAvailable[msg];
            }
                else { // Fallback to default language
                resourceAvailable = resource[this.defaultLanguage];
                return resourceAvailable[msg];
            }
        }
    };


    return LanguageVM;
});
