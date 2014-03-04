define(['logger'], function _definedLanguageVM(Logger) {

    'use strict';

    var resource;

    function LanguageVM(configuration) {
        this.logger = new Logger(configuration);
        this.language = ko.observable(this.getLanguage());
        this.defaultLanguage = 'en';

        if (this.logger && this.logger.logging)
            this.logger.log('info', 'Navigator language', this.language());
        // Chrome : 'nb', IE 11/Win app : 'nb-NO'

        resource = {

            'nb': {

                temperature: {
                    message: 'Temperatur'
                },

                heartrate: {
                    message: 'Hjertefrekvens',
                    details: "Vis hjertefrekvens detaljer"
                },

                speed: {
                    message : 'Hastighet'
                },

                cadence: {
                    message: 'Kadens'
                },

                sensors: {
                    message: 'Sensorer',
                    details: 'Vis integrert graf for alle oppdagede sensorer'
                },

                temperature_overview: {
                    message: 'Oversikt',
                    details : 'Vis temperatur oversikt'
                },

                    hrm_overview : {
                     message : 'Oversikt'
                    },

                 spdcad_overview : {
                    message : 'Oversikt'
                },

                about_part1: {
                   
                    message : 'Applikasjonen setter ANT USB enheten i skanne modus, og vil søke på ANT+ frekvensen 2457Mhz etter kringkastinger som sendes av diverse sensor typer, e.g en hjertefrekvens måler'
                },

                about_part2: {
                   
                    message: 'Dette projectet ville ha vært nesten umulig å gjennomføre uten innsatsen og kreativiten i avhengige biblioteker og ikon'
                },

                about_part3: {
                   
                 message: 'Applikasjonen og ANT USB biblioteket'
                },

                about_part4: {
                   
                    message: 'er utviklet i Javascript av Henning Knut Skoglund'
                },

                libraries: {
                    message: 'Biblioteker'
                },

                icons: {
                    message: 'Ikon'
                },

                speedandcadence: {
                    message: 'Hastighet og kadens',
                    details : 'Vis hastighet og kadens detaljer'
                },

                background: {
                    message: 'Bakgrunn',
                    details : 'Vis detaljer fra bakgrunnssider'
                }
            },

            'en': {

                temperature: {
                    message: 'Temperature'
                },

                heartrate: {
                    message: 'Heartrate',
                    details: 'Show heart rate details'
                },

                speed: {
                    message : 'Speed'
                },

                cadence: {
                    message : 'Cadence'
                },

                sensors : {
                    message: 'Sensors',
                    details: 'Show integrated chart visualizing data from all discovered sensors'
                },

                temperature_overview: {
                    message: 'Overview',
                    details : 'Show temperature overview'
                },

                hrm_overview : {
                    message : 'Overview'
                },

                spdcad_overview : {
                    message : 'Overview'
                },

                about_part1: {
                    message: 'The application sets the ANT USB stick into a scanning mode searching on the ANT+ frequency 2457Mhz for broadcasts sent by various sensor types, e.g a heart rate monitor.'
                },

                about_part2: {
                    message : 'This project would have been almost impossible without the effort and creativity in supporting dependant libraries and icons.'
                },

                about_part3: {
                    message : 'The application and the ANT USB library'
                },

                about_part4 : {
                    message : 'is developed in Javascript by Henning Knut Skoglund'
                },

                libraries: {
                    message : 'Libraries'
                },

                icons: {
                    message : 'Icons'
                },

                speedandcadence: {
                    message: 'Speed and cadence',
                    details : "Show temperature sensor details"
                },

                background: {
                    message: 'Background',
                    details : 'Show additional sensor details from background pages'
                }
            }
        };

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