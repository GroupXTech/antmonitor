/* global define: true, ko: true */

define(['vm/genericVM'], function (GenericVM) {

    'use strict';

    function BikeSharedVM(configuration) {
      GenericVM.call(this, configuration);
    }

      BikeSharedVM.prototype = Object.create(GenericVM.prototype);
      BikeSharedVM.prototype.constructor = BikeSharedVM;

      BikeSharedVM.prototype.yAxis = {
        id_speed : 'bike-speed-yAxis',
        id_cadence :'bike_cadence-yAxis',
        id_power : 'bike_power_yAxis'
      };

      BikeSharedVM.prototype.getSpeedYAxisConfiguration = function ()
      {

      return   {
            id: this.yAxis.id_speed,
            title: {
                //text: this.viewModel.rootVM.languageVM.speed().message.toLocaleUpperCase(),
                text : null,
                style: {
                    color: 'blue',
                    fontWeight: 'bold',
                    fontSize: '16px'
                }
            },

            min: 0,
            //max: 255,

            gridLineWidth: 0,

            //tickPositions: [],

            //startOnTick: false,

            // endOnTick: false,

            showEmpty: false,

            // Does not disable tooltip generation (series.tooltips) -> must use enableMouseTracking = false
            tooltip: {
                enabled: false
            },

            opposite: true,

            labels:
           {
               enabled: true,
               style: {
                   color: 'blue',
                   fontWeight: 'bold',
                   fontSize: '16px'
               }
           }
       };

      };

      BikeSharedVM.prototype.getCadenceYAxisConfiguration = function ()
      {
          return  {
               id: this.yAxis.id_cadence,
               title: {
                   //text: this.viewModel.rootVM.languageVM.cadence().message.toLocaleUpperCase(),
                   text :  null,
                   style: {
                       color: 'magenta',
                       fontSize: '16px',
                       fontWeight: 'bold'
                   }
               },

               min: 0,
               //max: 255,

               gridLineWidth: 0,

               //tickPositions: [],

               //startOnTick: false,

               // endOnTick: false,

               showEmpty: false,

               // Does not disable tooltip generation (series.tooltips) -> must use enableMouseTracking = false
               tooltip: {
                   enabled: false
               },

               opposite: true,

               labels:
              {
                  enabled: true,
                  style: {
                      color: 'magenta',
                      fontWeight: 'bold',
                      fontSize: '16px'
                  }
              }


           };

      };

      BikeSharedVM.prototype.getPowerYAxisConfiguration = function ()
      {
          return {
              id: this.yAxis.id_power,
              title: {
                  //text: this.viewModel.rootVM.languageVM.heartrate().message.toLocaleUpperCase(),
                  text : null,
                  style: {
                      color: 'orange',
                      fontSize: '16px',
                      fontWeight: 'bold'
                  }
              },

              min: 0,
              //max: 255,

              gridLineWidth: 0,

              //tickPositions: [],

              //startOnTick: false,

              // endOnTick: false,

              showEmpty: false,

              // Does not disable tooltip generation (series.tooltips) -> set  enableMouseTracking = false in invd. series options
              tooltip: {
                  enabled: false
              },

              labels:
              {
                  enabled: true,
                  style: {
                      color: 'orange',
                      fontWeight: 'bold',
                      fontSize: '16px'
                  }
              },

              opposite : true

          };
      };

      BikeSharedVM.prototype.reset = function ()
      {
        GenericVM.prototype.reset.call(this);
      };

      return BikeSharedVM;

    });
