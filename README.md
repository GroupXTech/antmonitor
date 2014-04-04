antmonitor
==========

A generic web app (aka Chrome packaged app/Windows Store app) that listen to ANT+ broadcasts from sensors (e.g heart rate) with visualization in a chart. It supports receiving broadcast from multiple sensors of the same device profile. A timer is available for basic timing.

Open for non-commercial/personal use : https://creativecommons.org/licenses/by-nc-nd/3.0/

Ubuntu 13.10 or later:

    * Listing of attached usb devices from Dynastream
        'lsusb | grep Dynastream'

    * Listing of processes that owns USB devices
        'sudo lsof +D /dev/bus/usb'

    * suunto kernel driver attaches automatically to ANT USB in latest linux kernels
        fixed by blacklisting it in /etc/modprobe.d/blacklist.conf, or dynamically by 'sudo rmmod suunto'

Tested platforms:

    Ubuntu 13.10 - Linux kernel 3.11.0-19-generic
    Chrome (unstable) v 35.0.1916.6 dev aura/Chrome v. 33

    Windows 8.1
    Chrome Canary/Chrome v.33

USB ANT hardware requirements:

    USB sticks:
        ANT USB 2 - Bus 00? Device 00?: ID 0fcf:1008 Dynastream Innovations, Inc. Mini stick Suunto
        ANT USB-m - Bus 00? Device 00?: ID 0fcf:1009 Dynastream Innovations, Inc.

    The app. wil only search for these vendor id/product id. on *nix based systems.

Currently supported ANT+ device profiles:

        Heart Rate Monitor HRM
        Bike Speed And Cadence SPDCAD
        Temperature ENVIRONMENT
