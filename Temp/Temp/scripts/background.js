/* global requirejs: true, setTimeout: true, chrome: true, window: true */

(function () {

    var loggerFunc;

    function Background(configuration)
    {
        var deps;

       this.timestamp = {
          startup : Date.now()
       };
        
        var requirejsConfiguration = {

            baseUrl: '../bower_components/libant',

            paths: {

                // Persistence

                db: '../../scripts/db',
                root: '../..'

            },

            waitSeconds: 180  // For debugging, so that I can set breakpoints before timeout

        };

        requirejs.config(requirejsConfiguration);

         this.startChromeApp();

        deps = ['logger'];

        requirejs(deps, function (Logger) {

            this.logger  = new Logger(configuration);

        }.bind(this));
        
        


        
    }

    // Handle TX response
    Background.prototype.releaseInterfaceAndCloseDevice = function(TXinformation)
    {
        var logger = this.logger,
            CLOSE_BP_DELAY = 15000, // Give a chance for onSuspend to be called (its about 10 seconds)
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
                        if (logger && logger.logging) logger.log('log', 'Closed ANT device');

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

        if (typeof usb === 'object' && usb.connectionHandle !== undefined && usb.deviceInterface !== undefined) {
           
            TXinfo =  {
                "direction": usb.deviceInterface.endpoints[1].direction,
                "endpoint": usb.deviceInterface.endpoints[1].address,       
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
        //if (this.isChromeBackgroundPage()) {
            
            this.handleChromeLifeCycleEvents();
        //}
    };

    Background.prototype.onRestarted = function ()
    {
        var now = Date.now();
        this.timestamp.onRestarted = now;
        
        var msg = 'App-life cycle event : onRestarted';
        if (this.logger && this.logger.logging)
            this.logger.log('log', msg);

        if (!this.logger)
            console.log(now, msg);

        this.createChromeAppWindow();
    };

    // On win8 is seems like the timeout for setting the "inactive" flag in the extension overview chrome://extensions is 15 seconds
    Background.prototype.onSuspend = function ()
    {
        var now = Date.now();
        this.timestamp.onSuspend = now;
        
        var msg = 'App-life cycle event : onSuspend - delay from startup '+(this.timestamp.onSuspend-this.timestamp.startup)+' ms. Background page is going down soon';
    
        if (this.logger && this.logger.logging)
            this.logger.log('log',msg );

        if (!this.logger)
            console.log(now,msg);
    };

    Background.prototype.onSuspendCanceled = function () {
        var now = Date.now();
        this.timestamp.onSuspendCanceled = now;
        
        var msg = 'App-life cycle event : onSuspendCanceled';
        if (this.logger && this.logger.logging)
            this.logger.log('log', msg);

        if (!this.logger)
            console.log(now, msg);

    };

    Background.prototype.onLaunched = function (launchData)
    {
        var now = Date.now();
        this.timestamp.onLaunched = now;
        var msg = 'App-life cycle event : onLaunched - launch data';
        if (this.logger && this.logger.logging)
            this.logger.log('log', msg, launchData);

        if (!this.logger)
            console.log(now,msg, launchData);

        this.createChromeAppWindow();

    };

    // When Chrome is restarted, can be simulated by right-click context menu "simulate browser restart" in the app window
    Background.prototype.onRestarted = function ()
    {
         var now = Date.now();
        this.timestamp.onRestarted = now;
        
        var msg = 'App-life cycle event : onRestarted';

        if (this.logger && this.logger.logging)
            this.logger.log('log',msg);

        if (!this.logger)
            console.log(now,msg);
        
        this.createChromeAppWindow();
    };

    // Reload Ctrl-R does a "update" of application
    Background.prototype.onInstalled = function (details)
    {

        var now = Date.now();
        this.timestamp.onRestarted = now;

        var msg = 'App-life cycle event : onInstalled';

        if (this.logger && this.logger.logging)
            this.logger.log('log',msg,details);

        if (!this.logger)
            console.log(now,msg,details);

          this.createChromeAppWindow();

    };

    // Chrome background page handles app life cycles events, i.e onLaunched
    Background.prototype.handleChromeLifeCycleEvents = function () {

        var DEFAULT_STARTUP_DELAY = 3000;

        chrome.app.runtime.onLaunched.addListener(this.onLaunched.bind(this));
        chrome.app.runtime.onRestarted.addListener(this.onRestarted.bind(this));
        
        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
        chrome.runtime.onSuspend.addListener(this.onSuspend.bind(this));
        chrome.runtime.onSuspendCanceled.addListener(this.onSuspend.bind(this));

        // In case app window want to post messages to the background page
        
        this.messageListener = this.onmessage.bind(this); 
        window.addEventListener('message', this.messageListener);

        chrome.runtime.getPlatformInfo(function (platformInfo) {
            // Logger probably not loaded yet
            console.info('Platform info', platformInfo,platformInfo.os,platformInfo.arch,platformInfo.nacl_arch);
        });

        console.info(Date.now(), 'Background page started');

        setTimeout(function _checkForLaunchOrRestart () {
            if (!this.timestamp.onLaunched || !this.timestamp.onRestarted)
            {
                console.warn(Date.now(),'Has not received expected onLaunched or onRestarted app life-cycle event during '+DEFAULT_STARTUP_DELAY+' ms',this.timestamp);
            }

        }.bind(this),DEFAULT_STARTUP_DELAY);
       
    };

    Background.prototype.createChromeAppWindow = function () {
        
        var appWinCreated = function (appWindow) {
           
            if (this.logger && this.logger.logging)
                this.logger.log('log', 'Created main window ' + appWindow.contentWindow.location.toString(),appWindow);

        }.bind(this),
            
          height,
          width,
          minHeight,
          minWidth;

        if (this.logger && this.logger.logging)
            this.logger.log('info','Screen for window', window.screen);
       
        // Issue: Multimonitor setup on ubuntu -> background window screen gets the screen dimensions of the first enumerated monitor (HDTV) by xrandr,
        // even if chrome was started on the second enumerated screen (ordinary laptop)

        height = Math.round( 0.75 * window.screen.height);
        width = Math.round(0.75 * window.screen.width);

        minWidth = Math.round(0.3 * window.screen.width);
        minHeight = Math.round(0.3 * window.screen.height);


        chrome.app.window.create('../default.html', { 'minWidth': minWidth, 'minHeight': minHeight, 'bounds': { 'width': width, 'height': height } }, appWinCreated);

    };

    void new Background({ log: true });

})();
