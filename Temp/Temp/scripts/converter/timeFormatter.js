/* global define: true */

define(function _requireDefineTimeFormatter() {

    function TimeFormatter()
    {

    }

    TimeFormatter.prototype.format = function (elapsedTime) {
        // Based on http://stackoverflow.com/questions/1322732/convert-seconds-to-hh-mm-ss-with-javascript
        var totalSec = (elapsedTime) / 1000;
        var hours = Math.floor(totalSec / 3600 % 24);
        var minutes = Math.floor(totalSec / 60 % 60);
        var seconds = Math.floor(totalSec % 60);

        var hoursStr;

        if (hours === 0)
            hoursStr = '';
        else
            hoursStr = (hours < 10 ? "0" + hours : hours) + ':';

        var result = hoursStr + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

        return result;
    };

    return TimeFormatter;
});
