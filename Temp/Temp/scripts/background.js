console.log('hello');

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

    Background.prototype.isChromeBackgroundPage = function () {
        return window.location.protocol === 'chrome-extension:' && window.location.pathname === '/_generated_background_page.html';
    }

    // Setup handlers for chrome app life-cycle events and load
    Background.prototype.startChromeApp = function () {
        if (this.isChromeBackgroundPage())
            this.handleChromeLifeCycleEvents();
    }

    Background.prototype.onlaunched = function (launchData)
    {
        if (this.logger && this.logger.logging)
            this.logger.log('log', 'App-life cycle : onLaunched', launchData);

        this.createChromeAppWindow();

    
    }

    // Chrome background page handles app life cycles events, i.e onLaunched
    Background.prototype.handleChromeLifeCycleEvents = function () {

        chrome.app.runtime.onLaunched.addListener(this.onlaunched.bind(this));

    }

    Background.prototype.createChromeAppWindow = function () {
        var appWinCreated = function (appWindow) {
            var mainAppWindow = appWindow;
            if (this.logger && this.logger.logging) this.logger.log('log', 'Created main window ' + appWindow.contentWindow.location.toString());
            //                                     mainAppWindow.onClosed.addListener(function () {                                  console.log(Date.now(),"MAIN WINDOW CLOSED!!!!!",mainAppWindow);
            //                                         
            //                                 });
        }.bind(this);

        chrome.app.window.create('../default.html', { 'minWidth': 200, 'minHeight': 60, 'bounds': { 'width': 630, 'height': 350 } }, appWinCreated);


    }

    void new Background();

})();