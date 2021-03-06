//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
}
var isMobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    isMobile = true;
    var supportsOrientationChange = "onorientationchange" in window,
        orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";
}
//IE support string includes
if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}
//IE support array includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
        enumerable: false,
        value: function (obj) {
            var newArr = this.filter(function (el) {
                return el == obj;
            });
            return newArr.length > 0;
        }
    });
}

var socket = io();
socket.on('forceRefresh', function () {
    window.location.reload();
});
socket.on('connect', function () {
    $("#chatLog").html("");
    socket.emit("updateUsers");
    if (localStorage.persistentLoginKey) {
        socket.emit('autologin', {
            email: localStorage.email,
            persistentLoginKey: localStorage.persistentLoginKey
        });

    }
    $("#loginLink").trigger("click");
    setInterval(function () {
        startPingTime = Date.now();
        socket.emit('ping');
    }, 5000);
    socket.emit("getVideo");
});

var permissions = [];
socket.on("getPermissions", function (perms) {
    permissions = perms;
    if (hasPermission("controlVideo")) {
        $("#togglePlay").show();
        $("#videoTrack").show();
    }
    $("#videoUrl").prop('disabled', false);
    $("#chatBar").prop('disabled', false);
    $("#videoUrl").attr('placeholder', "Search video name or input a url.");
    $("#chatBar").attr('placeholder', "Type here to chat");
});

function hasPermission(permString) {
    return permissions.includes(permString);
}
socket.on('disconnect', function () {

});

var startPingTime;
var latency;

socket.on('pong', function () {
    latency = Date.now() - startPingTime;
    console.log(latency);
});

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

//chrome notifications

// request permission on page load
document.addEventListener('DOMContentLoaded', function () {
    if (!Notification) {
        alert('Desktop notifications not available in your browser. Try Chromium.');
        return;
    }

    if (Notification.permission !== "granted")
        Notification.requestPermission();
});

function broserNotify(title, icon, msg) {
    if (Notification) {
        if (Notification.permission !== "granted")
            Notification.requestPermission();
        else {
            var notification = new Notification(title, {
                icon: icon,
                body: msg,
            });
            notification.onclick = function () {
                window.open("http://devl0rd.com/");
            };
        }
    }
}
function round(num) {
    return Math.round(num * 100) / 100;
}