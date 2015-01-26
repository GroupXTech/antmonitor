/* global define: true */

define(function _defineLanguageResource() {
    var resource;

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
                message: 'Hastighet'
            },

            power: {
              message: 'Kraft',
              details: 'Vis kraft oversikt'
            },

            cadence: {
                message: 'Kadens'
            },

            anchor_sensors: {
                message: 'Sensorer',
                details: 'Vis integrert graf for alle oppdagede sensorer'
            },

            anchor_settings: {
                message: 'Innstillinger',
                details: 'Vis instillinger'
            },

            temperature_overview: {
                message: 'Oversikt',
                details: 'Vis temperatur oversikt'
            },

             bike_power_overview: {
                message: 'Oversikt',
                details: 'Vis kraft oversikt'
            },

            hrm_overview: {
                message: 'Oversikt'
            },

            spdcad_overview: {
                message: 'Oversikt'
            },

            about_part1: {

                message: 'Applikasjonen setter ANT USB enheten i skanne modus, og vil søke på frekvensen 2457Mhz etter kringkastinger som sendes av diverse sensor typer, e.g en hjertefrekvens måler'
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

            about_licence_label : {
                message: 'Lisens'
            },

             about_licence_noncommercial : {
                message: 'Åpen, ikke-kommersiell'
            },

            libraries: {
                message: 'Biblioteker'
            },

            icons: {
                message: 'Ikon'
            },

            speedandcadence: {
                message: 'Hastighet-Kadens',
                details: 'Vis hastighet og kadens detaljer'
            },


            ant_monitor: {
                message: 'ANTmonitor',
                details: 'Om ANTmonitor'
            },

            minimum: {
                message: 'Minimum',
                abbreviated: 'MIN'
            },

            maximum: {
                message: 'Maksimum',
                abbreviated: 'MAKS'
            },

            location: {
                message: 'Sted...'
            },



            timer_start: {
                message : 'START'
            },
            timer_stop: {
                message : 'STOPP'
            },
            timer_lap : {
                message : 'RUNDE'
            },
            timer_reset:{
                message : 'NULLSTILL'
            },

            timer_total_elapsed_time : {
                message : 'TID'
            },

            timer_lap_time : {
                message : 'RUNDETID'
            },

            unit_cadence : {
               message : 'opm'
            },

            unit_power : {
               message : 'W'
            },

            unit_bpm: {
                message: 'spm'
            },

            unit_km_pr_h: {
                message: 'km/t'
            },

            unit_mph: {
                message: 'mi/t'
            },

            // SPDCAD

            spdcad_wheel_circumference : {
                message : 'Hjulomkrets'
            },

            // Settings

            setting_distance_mile : {
                message : 'Mile distanse'
            },

              setting_background_page_info : {
                message : 'Bakgrunn side info. fra sensor (e.g driftstid)'
            },

            setting_temperature_fahrenheit : {
                message : 'Fahrenheit'
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
                message: 'Speed'
            },

            power: {
              message: 'Power',
              details: 'Show power details'
            },

            cadence: {
                message: 'Cadence'
            },

            anchor_sensors: {
                message: 'Sensors',
                details: 'Show integrated chart visualizing data from all discovered sensors'
            },

             anchor_settings: {
                message: 'Settings',
                details: 'Show settings'
            },

            temperature_overview: {
                message: 'Overview',
                details: 'Show temperature overview'
            },

            bike_power_overview: {
                message: 'Overview',
                details: 'Show power overview'
            },

            hrm_overview: {
                message: 'Overview'
            },

            spdcad_overview: {
                message: 'Overview'
            },

            about_part1: {
                message: 'The application sets the ANT USB stick into a scanning mode searching on the frequency 2457Mhz for broadcasts sent by various sensor types, e.g a heart rate monitor.'
            },

            about_part2: {
                message: 'This project would have been almost impossible without the effort and creativity in supporting dependant libraries and icons.'
            },

            about_part3: {
                message: 'The application and the ANT USB library'
            },

            about_part4: {
                message: 'is developed in Javascript by Henning Knut Skoglund'
            },

            about_licence_label : {
                message: 'Licence'
            },

            about_licence_noncommercial : {
                message: 'Open, non-commercial'
            },

            libraries: {
                message: 'Libraries'
            },

            icons: {
                message: 'Icons'
            },

            speedandcadence: {
                message: 'Speed-Cadence',
                details: "Show speed and cadence (SPDCAD) sensor details"
            },


            ant_monitor: {
                message: 'ANTmonitor',
                details: 'About ANTmonitor'
            },

            minimum: {
                message: 'Minimum',
                abbreviated: 'MIN'
            },

            maximum: {
                message: 'Maximum',
                abbreviated: 'MAX'
            },

            location: {
                message: 'Location...'
            },

            timer_start: {
                message : 'START'
            },

            timer_stop: {
                message : 'STOP'
            },

            timer_lap : {
                message : 'LAP'
            },

            timer_reset:{
                message : 'RESET'
            },

            timer_total_elapsed_time : {
                message : 'TIME'
            },

            timer_lap_time : {
                message : 'LAPTIME'
            },

             unit_cadence : {
               message : 'rpm'
            },

             unit_power : {
               message : 'W'
            },


            unit_bpm: {
                message :'bpm'
            },

             unit_km_pr_h: {
                message: 'km/h'
             },

             unit_mph: {
                 message : 'mph'
             },

            // SPDCAD

            spdcad_wheel_circumference : {
                message : 'Wheel circumference'
            },

             // Settings

            setting_distance_mile : {
                message : 'Mile distance'
            },

             setting_background_page_info : {
                message : 'Background page info. (e.g operating time)'
            },

             setting_temperature_fahrenheit : {
                message : 'Fahrenheit'
            }

        }

    };

    return resource;

});
