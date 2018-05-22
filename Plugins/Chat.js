//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/17/2018
//Version: 1.0.0
var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
//Load DBS
var saveTimeout;


function init(plugins, settings, events, io, log, commands) {
    events.on("connection", function (socket) {
        socket.on('sendMessage', function (msg) {
            if (socket.isLoggedIn) {
                log(socket.email + ": " + msg)
                io.emit("newMessage", {
                    username: socket.username,
                    msg: msg,
                    profilePicture: socket.profilePicture
                })
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