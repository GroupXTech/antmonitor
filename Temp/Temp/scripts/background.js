(function () {

    function Background()
    {
      var  requirejsConfiguration = {

            baseUrl: '../bower_components/libant',

            paths: {

                // Persistence

                db: '../../scripts/db',
                root: '../..'

            },

            waitSeconds: 180  // For debugging, so that I can set breakpoints before timeout

        };

        requirejs.config(requirejsConfiguration);

        deps = ['logger'];

        requirejs(deps, function (Logger) {

            this.logger = new Logger({ log: true });
            if (this.logger && this.logger.logging)
                this.logger.log('info', 'Logger loaded');
          

        }.bind(this));

        this.startChromeApp();
        
    }

    // Handle TX response
    Background.prototype.releaseInterfaceAndCloseDevice = function(TXinformation)
    {
        var logger = this.logger,
            CLOSE_BP_DELAY = 1000,
            WAIT_FOR_RESET_DELAY = 500;

        if (TXinformation.resultCode !== 0) {
            if (logger && logger.logging) logger.log('error','Failed to send - Reset System Message - to ANT device');
        }
        else {
            if (logger && logger.logging) logger.log('info','Reset System message sent to ANT device');
            setTimeout( function () {
                chrome.usb.releaseInterface(this.usb.connectionHandle,this.usb.deviceInterface.interfaceNumber, function () {
                    if (logger && logger.logging) logger.log('log','Released ANT interface after a post reset delay of '+WAIT_FOR_RESET_DELAY+' ms');
                    chrome.usb.closeDevice(this.usb.connectionHandle, function _closed () { 
                        if (logger && logger.logging) logger.log('log','Closed ANT device',this.messageListener);
                        window.removeEventListener('message',this.messageListener);
                       
                        if (logger && logger.logging) logger.log('log',"Closing background page in "+CLOSE_BP_DELAY+ " ms");
                        setTimeout(function _closeBP ()
                        { window.close(); }, CLOSE_BP_DELAY); // Force shutdown of background page - don't wait for onSuspend (seems a bit unreliable)
                    }.bind(this));
                }.bind(this));
            }.bind(this), WAIT_FOR_RESET_DELAY);
        }
    };

    Background.prototype.handleANTReset = function (event)
    {
        var usb, TXinfo;
      
        this.usb = usb = event.data.reset.usb;
       
        // Release interface and close device

        // It's impossible to do any async. calls in the ordinary appWindow onClose-callback, so the background page gets the resposibility instead

        if (typeof usb === 'object' && usb.connectionHandle !== undefined && usb.deviceInterface !== undefined && usb.outEP !== undefined) {
           
            TXinfo =  {
                "direction": usb.outEP.direction,
                "endpoint": usb.outEP.address,       
                "data": event.data.reset.standardMessage.buffer

            };
            
            if (this.logger && this.logger.logging)
                this.logger.log('log','Sending a bulk transfer on out endpoint of Reset System Message',TXinfo);

            chrome.usb.bulkTransfer(usb.connectionHandle, TXinfo, this.releaseInterfaceAndCloseDevice.bind(this));

        } else {
            if (this.logger && this.logger.logging)
                this.logger.log('error', 'Received RESET message from chrome host without sufficient usb state',this.usb);
            
            window.removeEventListener('message', this.messageListener);
           // window.close(); // Force shutdown on background page to release resources/process
        }
           
    };

    // Handles messages from, i.e app window
    Background.prototype.onmessage = function (event)
    {
       
        if (this.logger && this.logger.logging)
            this.logger.log('log', window.location.pathname+' received message' , event);

        if (event.data.reset) 
            this.handleANTReset(event);

    };

    Background.prototype.isChromeBackgroundPage = function () {
        return window.location.protocol === 'chrome-extension:' && window.location.pathname === '/_generated_background_page.html';
    };

    // Setup handlers for chrome app life-cycle events and load
    Background.prototype.startChromeApp = function () {
        if (this.isChromeBackgroundPage()) {
            
            this.handleChromeLifeCycleEvents();
        }
    };

    Background.prototype.onRestarted = function ()
    {
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle event : onRestarted');

        this.createChromeAppWindow();
    };

    // On win8 is seems like the timeout for setting the "inactive" flag in the extension overview chrome://extensions is 15 seconds
    Background.prototype.onSuspend = function ()
    {
       
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle event : onSuspend');
    };

    Background.prototype.onSuspendCanceled = function () {
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle event : onSuspendCanceled');
    };

    Background.prototype.onLaunched = function (launchData)
    {
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle event : onLaunched - launch data', launchData);

        this.createChromeAppWindow();

    };

    // When Chrome is restarted, can be simulated by right-click context menu "simulate browser restart" in the app window
    Background.prototype.onRestarted = function ()
    {
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle event : onRestarted');
        
        this.createChromeAppWindow();
    };

    // Chrome background page handles app life cycles events, i.e onLaunched
    Background.prototype.handleChromeLifeCycleEvents = function () {

        console.info(Date.now(), 'Background page started');

        chrome.app.runtime.onLaunched.addListener(this.onLaunched.bind(this));
        chrome.app.runtime.onRestarted.addListener(this.onRestarted.bind(this));
        chrome.runtime.onSuspend.addListener(this.onSuspend.bind(this));
        chrome.runtime.onSuspendCanceled.addListener(this.onSuspend.bind(this));

        // In case app window want to post messages
        this.messageListener = this.onmessage.bind(this); 
        window.addEventListener('message', this.messageListener);

        //chrome.runtime.getPlatformInfo(function _getPlatformInfo(platformInfo) {
        //    if (this.logger && this.logger.logging)
        //        this.logger.log('info', 'Platform info', platformInfo);
        //}.bind(this));
       
    };

    Background.prototype.createChromeAppWindow = function () {
        var appWinCreated = function (appWindow) {
           
            if (this.logger && this.logger.logging)
                this.logger.log('log', 'Created main window ' + appWindow.contentWindow.location.toString());

        }.bind(this);

        chrome.app.window.create('../default.html', { 'minWidth': 200, 'minHeight': 160, 'bounds': { 'width': 1050, 'height': 750 } }, appWinCreated);

    };

    void new Background();

})();