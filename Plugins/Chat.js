//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
function init(plugins, settings, events, io, log, commands) {
    events.on("connection", function (socket) {
        socket.on('sendMessage', function (msg) {
            if (socket.isLoggedIn) {
                if (!socket.messageTimeout) {
                    socket.messageTimeout = 0;
                }
                var nowMS = new Date().getTime();

                if (nowMS > socket.messageTimeout) {
                    socket.messageTimeout = nowMS + 1000;
                    log(socket.email + ": " + msg)
                    io.emit("newMessage", {
                        username: socket.username,
                        msg: msg,
                        profilePicture: socket.profilePicture
                    })
                } else {
                    socket.messageTimeout = nowMS + 1000;
                    socket.emit("newMessage", {
                        username: "Server",
                        msg: "You must wait at least 1 second between messages.",
                        profilePicture: socket.profilePicture
                    })
                }
            }

        })
        socket.on('isTyping', function () {
            if (socket.isLoggedIn) {
                io.emit('isTyping', {
                    email: socket.email,
                    username: socket.username
                })
            }
        })
    })
}
module.exports.init = init;