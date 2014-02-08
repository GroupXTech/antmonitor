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

            this.logger = new Logger(true);

        }.bind(this));

        this.startChromeApp();
    }

    // Handle TX response
    Background.prototype.onTX = function(TXinformation)
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
                chrome.usb.releaseInterface(usb.connectionHandle,usb.deviceInterface.interfaceNumber, function () {
                    if (logger && logger.logging) logger.log('log','Released USB ANT interface');
                    chrome.usb.closeDevice(usb.connectionHandle, function _closed () { 
                        if (logger && logger.logging) logger.log('log','Closed USB ANT device');
                        window.removeEventListener('message',messageHandler);
                        // mainAppWindow.close();
                        if (logger && logger.logging) logger.log('log',"Closing background page in "+CLOSE_BP_DELAY+ " ms");
                        setTimeout(function _closeBP ()
                        { window.close(); }, CLOSE_BP_DELAY); // Force shutdown of background page
                    });
                });
            }, WAIT_FOR_RESET_DELAY);
        }
    };

    Background.prototype.handleANTReset = function (event)
    {
        var usb, TXinfo;
      
        usb = event.data.reset.usb;

        // Release interface and close device
        // It's possible do any async. calls in the ordinary appWindow onClose-callback, so the background page gets the resposibility instead

        if (typeof usb === 'object' && usb.connectionHandle !== undefined && usb.deviceInterface !== undefined) {
           
            TXinfo =  {
                "direction": usb.outEP.direction,
                "endpoint": usb.outEP.address,       
                "data": e.data.reset.standardMessage.buffer

            };
            
            if (this.logger && this.logger.logging)
                this.logger.log('log','Sending a bulk transfer on out endpoint of Reset System Message',TXinfo);

            chrome.usb.bulkTransfer(usb.connectionHandle,TXinfo, this.onTX.bind(this));

        } else
            window.close(); // Force shutdown on background page to release resources/process
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
        if (this.isChromeBackgroundPage())
            this.handleChromeLifeCycleEvents();
    };

    Background.prototype.onlaunched = function (launchData)
    {
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle event : onLaunched - launch data', launchData);

        this.createChromeAppWindow();

    };

    // Chrome background page handles app life cycles events, i.e onLaunched
    Background.prototype.handleChromeLifeCycleEvents = function () {

        chrome.app.runtime.onLaunched.addListener(this.onlaunched.bind(this));

        // In case app window want to post messages
        window.addEventListener('message', this.onmessage.bind(this));

    };

    Background.prototype.createChromeAppWindow = function () {
        var appWinCreated = function (appWindow) {
           
            if (this.logger && this.logger.logging)
                this.logger.log('log', 'Created main window ' + appWindow.contentWindow.location.toString());

            // This callback is never called from appWindow when closed is pressed - seems rather weird cause
           
            //appWindow.onClosed.addListener(function () {
            //    console.log(Date.now(), "MAIN WINDOW CLOSED!!!!!", mainAppWindow);
            //    // TO DO : reset 
            //});

            

        }.bind(this);

        chrome.app.window.create('../default.html', { 'minWidth': 200, 'minHeight': 160, 'bounds': { 'width': 630, 'height': 580 } }, appWinCreated);


    };

    void new Background();

})();