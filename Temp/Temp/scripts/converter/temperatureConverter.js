/* global define: true */

define( function () {

    'use strict';

    function TemperatureConverter() {

    }

    TemperatureConverter.prototype.conversionFactorFahrenheit = 9 / 5;

    TemperatureConverter.prototype.fromCelciusToFahrenheit = function (celciusTemp) {

        return celciusTemp * this.conversionFactorFahrenheit + 32;
    };

    TemperatureConverter.prototype.fromFahrenheitToCelcius = function (fahrenheitTemp) {

        return (fahrenheitTemp - 32) / this.conversionFactorFahrenheit;
    };


    return TemperatureConverter;

});
