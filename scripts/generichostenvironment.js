/* global define: true, window: true, require: true, setTimeout: true */

define(['logger'], function _requireDefine(Logger) {

    'use strict';

    function GenericHostEnvironment(options) {

        if (!options)
        {
            options = {};
        }

        this.options = options;

        options.logSource = this;

        this.logger = new Logger(options);

        // Used for sending a page received form the device profile as  a message to UI frame

        this.pageFromDeviceProfile = { page: undefined };

        // String id of module

        this.moduleId = {
            storage: undefined,
            usb: undefined
        };

        // Constructor function to modules
        this.module = {

        };

        // Setup receiver of message events

        window.addEventListener('message', this.onmessage.bind(this)); // Force this on the message callback

        setTimeout(function () {
            if (!this.uiFrame) {
                if (this.logger && this.logger.logging) {
                    this.logger.log('warn', 'Has not received ready signal from UI frame');
                }
            }
        }.bind(this), 10000);

    }

    GenericHostEnvironment.prototype.postMessage = function (obj) {
        if (this.uiFrame) {
            this.uiFrame.postMessage(obj, '*');
        } else
            if (this.logger && this.logger.logging) {
                this.logger.log('error', 'No UI frame available, cannot post', obj);
            }
    };

    // Get messages from embedded UI frame, in Chrome it runs in a sandbox mode to avoid content security policy restrictions
    GenericHostEnvironment.prototype.onmessage = function (event) {

        var data = event.data;

        //if (this.logger && this.logger.logging) this.logger.log('info',  'received message', event);

        if (!data) {
            if (this.logger && this.logger.logging) {
                this.logger.log('warn', 'no/undefined data received');
            }
            return;
        }

        switch (data.request) {

            // UI frame ready to receive messages

            case 'ready':

                this.uiFrame = window.frames[0];

                if (this.logger && this.logger.logging) {
                    this.logger.log('log', 'got READY signal from UI');
                }

                break;

                // Storage handling

            case 'get':

                if (!data.sensorId) {
                    if (this.logger && this.logger.logging) {
                        this.logger.log('error', 'No sensor id. available in get request, cannot proceed with get request', data);
                    }
                    return;

                }

                this.storage.get(data.items, function _getkey(items) {

                    var getResponse = { response: 'get', sensorId: data.sensorId, items: items, requestitems: data.items };

                    this.postMessage(getResponse);

                }.bind(this));

                break;

            case 'set':

                this.storage.set(data.items, function _setKeys() {
                    this.postMessage({ response: 'set', items: data.items }); // ECHO to ui when data are saved
                }.bind(this));


                break;

            default:

                if (this.logger && this.logger.logging) {
                    this.logger.log('error', 'Unable to do anything with data response', data);
                }

                break;
        }

    };

    GenericHostEnvironment.prototype.init = function () {
        throw new Error('Generic Init should be overridden/shadowed in descendant objects');
    };

    GenericHostEnvironment.prototype.loadSubSystems = function () {
        require(['anthost', this.moduleId.usb, 'profiles/RxScanMode', this.moduleId.storage],
            this.onSubsystemLoaded.bind(this));
    };

    // Initialization of ANT host and USB
    GenericHostEnvironment.prototype.onSubsystemLoaded = function (ANTHost, USBHost, RxScanMode, Storage) {

        this.storage = new Storage({ log: true });

        this.host = new ANTHost({ log: true });

        this.module.usb = USBHost;
        this.module.rxscanmode = RxScanMode;

        // Get default device specified by user
        this.storage.get(Object.getPrototypeOf(this.storage).KEY.defaultDeviceId, function (db) {

            this.configureUSB(db[Object.getPrototypeOf(this.storage).KEY.defaultDeviceId]);
        }.bind(this));
    };

    GenericHostEnvironment.prototype.configureUSB = function (deviceId) {

        var USBoptions = {

            deviceId: deviceId,

            log: true,

            // Requested transfer size 512 bytes - allows reading of driver buffered data

            length: { in: 64 * 8 },


        };

        var usb = new this.module.usb(USBoptions),
            hostOptions;

        hostOptions = {

            usb: usb,

            // Reset device during init
            reset: true,

            // Append extended data
            libconfig: 'channelid,rxtimestamp,rssi',

            //maxTransferRetries : 5, // Default = 5

            // Increased to 2 seconds to allow for handling buffered data (typically broadcasts) by driver (WINUSB)
            // at start without any resending
            transferProcessingLatency: 2000, // Default = 10 ms

            log: true
        };

        this.channel = new this.module.rxscanmode({
            log: true,
            channelId: {
                deviceNumber: 0,
                //  deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                deviceType: 0,
                transmissionType: 0
            }
        });

        this.channel.addEventListener('page', this.onpage.bind(this));

        this.host.init(hostOptions, this.onHostInit.bind(this));
    };

    GenericHostEnvironment.prototype.onChannelEstablished = function (error, _pchannel) {
        //console.profileEnd();

        if (!error && this.logger.logging) {
            window.frames[0].postMessage({ response: 'ready' }, '*'); // Signal to UI frame that host is ready
            this.logger.log('log', 'Channel established', _pchannel);
        }
        else if (this.logger.logging) {
            this.logger.log('log', 'Failed to establish channel', error.message);
        }
        //        this.closeChannel(channel.establish.channelNumber, function (error,responseMsg)
        //                          {
        //                              if (error)
        //                                  this.log.log('log','Failed to close channel',channel.establish.channelNumber,error.message);
        //
        //                          }.bind(this));

    };

    GenericHostEnvironment.prototype.onHostInit = function _hostInitCB(error) {
        // console.trace();
        //  console.profileEnd();
        if (error && this.logger && this.logger.logging) {
            this.logger.log('error', "ANT host - NOT - initialized, cannot establish channel on device ", error.message, error.stack);
        }
        else {
            if (this.logger && this.logger.logging) {
                this.logger.log('log', "ANT host initialized");
            }
            if (typeof this.host.usb.getDeviceWatcher === 'function' && this.logger && this.logger.logging) {
                this.logger.log('log', 'Host environment offers device watching capability, e.g windows 8.1');
            }

            // console.profile('Establish channel');

            this.host.establishChannel({
                channelNumber: 0,
                networkNumber: 0,
                // channelPeriod will be ignored for RxScanMode channel
                //channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
                configurationName: 'slave only',
                channel: this.channel,
                open: true
            }, this.onChannelEstablished.bind(this));

        }
    };

    // Receives page from device profile and forwards it to the UI frame
    GenericHostEnvironment.prototype.onpage = function (page) {
        if (this.logger && this.logger.logging) {
            this.logger.log('log', 'received page', page);
        }
        if (typeof page.clone === 'function') {
            this.pageFromDeviceProfile = page.clone(); // Allows tailoring of object to avoid DataCloneError
        } else {
            this.pageFromDeviceProfile = page;
        }
        // Possible exception here DataCloneError -> try catch block ? IE 11
        try {
            //setTimeout(function () {
            //for (var i = 0; i <= 10000;i++)
            //window.pageFromDeviceProfile = page; // FOR DEBUGGING dataclone error (misses local variabels during debugging in IE 11/VS 2013);
            if (this.uiFrame) // 'ready' must be received from uiFrame before its available (from window.frames[0])
            {
                this.uiFrame.postMessage({
                    response: 'page',
                    sensorId: page.broadcast.channelId.sensorId,
                    page: this.pageFromDeviceProfile
                }, '*');
            }
            else if (this.logger && this.logger.logging)
            {
                this.logger.log('warn', 'Received page from device profile, but ui frame message handler is not ready for it', this.pageFromDeviceProfile);
            }
            // }.bind(this), 0);
        } catch (e) {
            if (this.logger && this.logger.logging)
            {
                this.logger.log('error', 'Error', e, 'page from device profile', this.pageFromDeviceProfile);
            }
        }
    };

    return GenericHostEnvironment;

});
