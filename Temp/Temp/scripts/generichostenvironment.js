/* global define: true, window: true, require: true */

define(['logger'], function _requireDefine(Logger) {

    'use strict';

    function GenericHostEnvironment(options) {

        var log;

       if (!options)
            options = {};

        this.options = options;

        options.logSource = this.constructor || GenericHostEnvironment;

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

    }

    GenericHostEnvironment.prototype.postMessage = function (obj)
    {
        if (this.uiFrame)
          this.uiFrame.postMessage(obj, '*');
    };

    // Get messages from embedded UI frame, in Chrome it runs in a sandbox mode to avoid content security policy restrictions
    GenericHostEnvironment.prototype.onmessage = function (event) {

        var sourceWindow = event.source,
            data = event.data;


        if (this.logger && this.logger.logging) this.logger.log('info',  'received message', event);

        if (!data) {
            if (this.logger && this.logger.logging) this.logger.log('warn','no/undefined data received');
            return;
        }

        switch (data.request) {

            // UI frame ready to receive messages

            case 'ready':

                this.uiFrameReady = true;

                this.uiFrame = window.frames[0];

                if (this.logger && this.logger.logging)
                    this.logger.log('log', 'got READY signal from UI');

                break;

            // Storage handling

            case 'get':

                if (!data.sensorId)
                {
                     if (this.logger && this.logger.logging)
                        this.logger.log('error', 'No sensor id. available in get request, cannot proceed with get request',data);

                     return;

                }

                this.storage.get(data.items, function _getkey(items) {

                    var getResponse = { response: 'get', sensorId : data.sensorId,items : items, requestitems : data.items };

                    this.postMessage(getResponse);

                }.bind(this));
               
                break;

            case 'set':

                this.storage.set(data.items, function _setKeys() {
                    this.postMessage({ response : 'set', items : data.items}); // ECHO to ui when data are saved
                }.bind(this));
               

                break;

            default:

                if (this.logger && this.logger.logging) this.logger.log('error', 'Unable to do anything with data response', data);
                break;
        }

    };

    GenericHostEnvironment.prototype.init = function ()
    {
        throw new Error('Generic Init should be overridden/shadowed in descendant objects');
    };

    GenericHostEnvironment.prototype.loadSubSystems = function ()
    {
        require(['anthost', this.moduleId.usb, 'profiles/environment/deviceProfile_ENVIRONMENT', 'profiles/RxScanMode', this.moduleId.storage, 'logger'],
            this.onSubsystemLoaded.bind(this));
    };

    // Initialization of ANT host and USB
    GenericHostEnvironment.prototype.onSubsystemLoaded = function (ANTHost, USBHost, TEMPprofile, RxScanMode, Storage, Logger) {



        this.storage = new Storage({ log: true });

        this.host = new ANTHost({log : true});
        
        this.module.usb = USBHost;
        this.module.rxscanmode = RxScanMode;

        // Get default device specified by user
        this.storage.get(this.storage.__proto__.key.defaultDeviceId, function (db) {
   
            this.configureUSB(db[this.storage.__proto__.key.defaultDeviceId]);
        }.bind(this));
};

GenericHostEnvironment.prototype.configureUSB = function(deviceId) {
     
 var USBoptions = {
     
            deviceId : deviceId,

            log: true,

            // Requested transfer size 512 bytes - allows reading of driver buffered data

            length: { in: 64 * 8 },

            // Windows 8 USB: Subscribe to events from device watcher in the USB subsystem

            deviceWatcher: {

                onAdded: function (deviceInformation) {
                    var host = this.host;

                    //rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                    //// rootVM.deviceVM.enumeratedDevice.push(deviceInformation);
                    ////rootVM.deviceVM.enumeratedDevice.push({ name: 'TEST USB', id: 'testid' });

                    //if (deviceInformation.id === host.usb.options.deviceId) {
                    //    // Keep local storage synchronized (i.e deviceId was undefined during enumeration,
                    //    // but found among the known devices.

                    //    this.storage.set(this.storage.__proto__.key.defaultDeviceId, deviceInformation.id);

                    //    // Update selection with the specific device please, if the select drop-down is used

                    //    rootVM.deviceVM.selectedDevice(deviceInformation);
                    //}

                }.bind(this),

                onRemoved: function (deviceInformation) {
                    //// Remove from UI
                    //rootVM.deviceVM.enumeratedDevice.remove(
                    //    // predicate - compares underlying array value with a condition
                    //    // http://knockoutjs.com/documentation/observableArrays.html #remove and removeAll
                    //    function (value) { return value.id === deviceInformation.id; });

                }.bind(this.host),

                onEnumerationCompleted: function () {

                    var host = this.host;

                    //rootVM.deviceVM.enumerationCompleted(true);

                    //// In case deviceId is updated, during enumeration
                    //if (host.usb.options.deviceId)
                    //    this.storage.set(this.storage.__proto__.key.defaultDeviceId, host.usb.options.deviceId);

                    ////
                    //var devInfo;
                    //for (var devNum = 0; devNum < rootVM.deviceVM.enumeratedDevice().length; devNum++) {
                    //    devInfo = rootVM.deviceVM.enumeratedDevice()[devNum];
                    //    if (host.usb.options.deviceId === devInfo.id) {
                    //        rootVM.deviceVM.selectedDevice(devInfo);
                    //        break;
                    //    }
                    //}

                }.bind(this),

                onStopped: function () { }.bind(this.host),

                onUpdated: function () { }.bind(this.host)
                }
            };

            var usb = new this.module.usb(USBoptions),
                hostOptions,
                hostInitCB;

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

            var onChannelEstablished = function (error, _pchannel) {
                //console.profileEnd();

                if (!error && this.log.logging) {
                    window.frames[0].postMessage({ response: 'ready' },'*'); // Signal to UI frame that host is ready
                    this.log.log('log', 'Channel established', _pchannel);
                }
                else if (this.log.logging)
                    this.log.log('log', 'Failed to establish channel', error.message);

                //        this.closeChannel(channel.establish.channelNumber, function (error,responseMsg)
                //                          {
                //                              if (error)
                //                                  this.log.log('log','Failed to close channel',channel.establish.channelNumber,error.message);
                //                              
                //                          }.bind(this));

            }.bind(this.host);

            var channel = new this.module.rxscanmode({
                log: true,
                channelId: {
                    deviceNumber: 0,
                    //  deviceType : TEMPprofile.prototype.CHANNEL_ID.DEVICE_TYPE,
                    deviceType: 0,
                    transmissionType: 0
                }
            });

            this.channel = channel;

            channel.addEventListener('page',this.onpage.bind(this));

            hostInitCB = function _hostInitCB(error) {
                // console.trace();
                //  console.profileEnd();
                if (error && this.logger && this.logger.logging)
                    this.logger.log('error', "ANT host - NOT - initialized, cannot establish channel on device ", error.message, error.stack);
                else {
                    if (this.logger && this.logger.logging)
                        this.logger.log('log', "ANT host initialized");

                    if (typeof this.host.usb.getDeviceWatcher === 'function' && this.logger && this.logger.logging)
                        this.logger.log('log', 'Host environment offers device watching capability, e.g windows 8.1');

                    // console.profile('Establish channel');

                    this.host.establishChannel({
                        channelNumber: 0,
                        networkNumber: 0,
                        // channelPeriod will be ignored for RxScanMode channel
                        //channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
                        configurationName: 'slave only',
                        channel: channel,
                        open: true
                    }, onChannelEstablished);

                }
            }.bind(this);

            this.host.init(hostOptions, hostInitCB);
        };


    // Receives page from device profile and forwards it to the UI frame
    GenericHostEnvironment.prototype.onpage = function (page) {
        if (this.logger && this.logger.logging)
            this.logger.log('log','received page', page);

        if (typeof page.clone === 'function')
            this.pageFromDeviceProfile = page.clone();
        else
            this.pageFromDeviceProfile = page;
        // Possible exception here DataCloneError -> try catch block ? IE 11
        try {
            //setTimeout(function () {
            //for (var i = 0; i <= 10000;i++)
            //window.pageFromDeviceProfile = page; // FOR DEBUGGING dataclone error (misses local variabels during debugging in IE 11/VS 2013);
            if (this.uiFrame) // 'ready' must be received from uiFrame before its available (from window.frames[0])
                this.uiFrame.postMessage({
                    response: 'page',
                    sensorId : page.broadcast.channelId.sensorId,
                    page: this.pageFromDeviceProfile
                }, '*');
            else if (this.logger && this.logger.logging)
                this.logger.log('warn', 'Received page from device profile, but ui frame message handler is not ready for it', this.pageFromDeviceProfile);
            // }.bind(this), 0);
        } catch (e) {
            if (this.logger && this.logger.logging)
                this.logger.log('error', 'Error', e, 'page from device profile', this.pageFromDeviceProfile);
        }
    };

    return GenericHostEnvironment;
    
});
