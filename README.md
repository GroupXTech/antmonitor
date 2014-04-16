antmonitor
==========

A web app (aka Chrome packaged app/Windows Store app) that listen to ANT+ broadcasts from sensors (e.g heart rate) with visualization in a chart. It supports receiving broadcast from multiple sensors of the same device profile. A timer is available for basic timing.

Open for **non-commercial/personal** use : https://creativecommons.org/licenses/by-nc-nd/3.0/

Ubuntu 13.10 or later:

    * Listing of attached usb devices from Dynastream
        'lsusb | grep Dynastream'

    * Listing of processes that owns USB devices
        'sudo lsof +D /dev/bus/usb'

    * suunto/usb-serial-simple kernel driver attaches automatically to ANT USB in latest linux kernels
        fixed by blacklisting it in /etc/modprobe.d/blacklist.conf, or dynamically by 'sudo rmmod suunto'/'sudo rmmod usb-serial-simple'

Tested platforms:

    Ubuntu 13.10 - Linux kernel 3.11.0-19-generic 
    Ubuntu 14.04 (dev. branch) - Linux kernel 3.13.0-23-generic
    
        Chrome (unstable) v 35.0.1916.6 dev aura
        Chrome v. 34.0.1847.116

    Windows 8.1
    
        Chrome Canary
        Chrome

USB ANT hardware requirements:

    USB sticks:
    
        ANT USB 2 - Bus 00? Device 00?: ID 0fcf:1008 Dynastream Innovations, Inc. Mini stick Suunto
        ANT USB-m - Bus 00? Device 00?: ID 0fcf:1009 Dynastream Innovations, Inc.

    The app. wil only search for these vendor id/product id. on *nix based systems.

Currently supported ANT+ device profiles:

        Heart Rate Monitor HRM
        Bike Speed And Cadence SPDCAD
        Temperature ENVIRONMENT

        In progress:
        
            Bike Speed
            Bike Cadence
            HRM legacy
            
Development platform:

    Two USB ANT sticks
    Linux KVM (VMWARE also works, Virtualbox has timer issues)
        Win XP virtual machine with  [SimulANT+](http://www.thisisant.com/developer/resources/downloads/ "SimulANT+") v ADY1.5.0.0
    Chrome 
    Brackets
    