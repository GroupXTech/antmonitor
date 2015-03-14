antmonitor
==========

A web app that listen to broadcasts from sensors (e.g heart rate) with visualization in a chart. It supports receiving broadcast from multiple sensors of the same device profile. A timer is available for basic timing.

Open for **non-commercial/personal** use : https://creativecommons.org/licenses/by-nc-nd/3.0/

Screenshot:

![Screenshot](/screenshot/chrome/ANTmonitor-github.png?raw=true)

###Installation
1. Download latest release https://github.com/hkskoglund/antmonitor/releases
2. Unzip
3. Run 'bower install' (for knockoutjs/highcharts/libantjs)
4. Load app in chrome browser in developer mode (chrome://extensions)

*nix:

    * Listing of attached usb devices from Dynastream
        'lsusb -d 0x0fcf:'

    * Listing of processes that owns USB devices
        'sudo lsof +D /dev/bus/usb'

    * suunto/usb-serial-simple kernel driver attaches automatically to ANT USB in latest linux kernels
        fixed by blacklisting it in /etc/modprobe.d/blacklist.conf, or dynamically by 'sudo rmmod suunto'/'sudo rmmod usb-serial-simple'

    * Tracing usb traffic/packets on bus 4

       'cat /sys/kernel/debug/usb/usbmon/4u'

USB ANT hardware requirements:

    USB sticks:

        ANT USB 2 - Bus 00? Device 00?: ID 0fcf:1008 Dynastream Innovations, Inc. Mini stick Suunto
        ANT USB-m - Bus 00? Device 00?: ID 0fcf:1009 Dynastream Innovations, Inc.

    The app. wil only search for these vendor id/product id. on *nix based systems.

Currently supported device profiles:

        Heart Rate Monitor (including legacy)
        Bike Speed And Cadence/Speed/Cadence (including legacy)
        Temperature

Development platform:

    Two USB ANT sticks
    Linux KVM (VMWARE also works, Virtualbox has timer issues)
        Windows virtual machine with  [SimulANT+](http://www.thisisant.com/developer/resources/downloads/ "SimulANT+") v ADY1.5.0.0
    Chrome
    Brackets
