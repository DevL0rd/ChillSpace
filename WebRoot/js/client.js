Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
}
//IE support
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


var socket = io();

socket.on('forceRefresh', function () {
    window.location.reload();
});
socket.on('connect', function () {
    socket.emit("getVideo");
    socket.emit("updateUsers");
    if (localStorage.persistentLoginKey != null && localStorage.persistentLoginKey != "") {
        socket.emit('autologin', {
            email: localStorage.email,
            persistentLoginKey: localStorage.persistentLoginKey
        });
    }
});

socket.on('disconnect', function () {

});