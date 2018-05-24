//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
var chatLog = [];
function init(plugins, settings, events, io, log, commands) {
    events.on("connection", function (socket) {
        socket.emit("getChatLog", chatLog);
        socket.on('sendMessage', function (msg) {
            if (socket.isLoggedIn && msg) {
                if (!socket.messageTimeout) {
                    socket.messageTimeout = 0;
                }
                var nowMS = new Date().getTime();
                if (nowMS > socket.messageTimeout) {
                    socket.messageTimeout = nowMS + 1000;
                    log(socket.email + ": " + msg)
                    var msgObj = {
                        username: socket.username,
                        msg: msg,
                        profilePicture: socket.profilePicture
                    };
                    io.emit("newMessage", msgObj)
                    chatLog.push(msgObj);
                    if (chatLog.length > 60) {
                        chatLog.shift();
                    }
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