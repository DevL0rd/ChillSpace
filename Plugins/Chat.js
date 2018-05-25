//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
var chatLog = [];
var serverIo;
var serverPlugins;
function init(plugins, settings, events, io, log, commands) {
    serverIo = io
    serverPlugins = plugins;
    events.on("connection", function (socket) {
        socket.emit("getChatLog", chatLog);
        socket.on('sendMessage', function (msg) {
            if (socket.isLoggedIn && msg) {
                if (!socket.messageTimeout) {
                    socket.messageTimeout = 0;
                }
                var nowMS = new Date().getTime();
                if (nowMS > socket.messageTimeout) {
                    log(socket.email + ": " + msg)
                    msg = msg.replace(/<[^>]+>/g, ''); // sanatize input, remove html tags.
                    if (msg.charAt(0) == "!") {
                        var fullMessage = msg.slice(1);
                        var args = fullMessage.split(" ");
                        var fullMessage = fullMessage.substr(fullMessage.indexOf(" ") + 1);
                        var command = args.shift().toLowerCase();
                        handleCommand(command, args, fullMessage, socket);
                    } else {
                        sendMessage(socket, msg);
                    }
                } else {
                    sendServerPm(socket, "You must wait at least 1 second between messages.", 6000)
                }
                socket.messageTimeout = nowMS + 1000;

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
function getBadges(email) {
    var perms = serverPlugins["Accounts"].getPermissions(email);
    var badges = [];
    for (i in perms) {
        var perm = perms[i];
        if (perm.includes("badge_")) {
            badges.push(perm.split("badge_").pop());
        }
    }
    return badges;
}
function sendMessage(socket, msg) {
    var msgObj = {
        username: socket.username,
        msg: msg,
        profilePicture: socket.profilePicture,
        badges: getBadges(socket.email)
    };
    serverIo.emit("newMessage", msgObj)
    chatLog.push(msgObj);
    if (chatLog.length > 60) {
        chatLog.shift();
    }
}
function sendPm(socket, toSocket, msg) {
    var msgObj = {
        username: socket.username,
        msg: msg,
        profilePicture: socket.profilePicture,
        badges: getBadges(socket.email),
        isPM: true
    };
    toSocket.emit("newMessage", msgObj)
}
function sendServerPm(socket, msg, timeout = 0) {
    var msgObj = {
        username: "Server",
        msg: msg,
        profilePicture: "img/profilePics/server.png",
        badges: [],
        timeout: timeout,
        isPM: true
    };
    socket.emit("newMessage", msgObj)
}
function sendServerBroadcast(msg, timeout = 0) {
    var msgObj = {
        username: "Server",
        msg: msg,
        profilePicture: "img/profilePics/server.png",
        timeout: timeout,
        badges: []
    };
    serverIo.emit("newMessage", msgObj);
    if (!timeout) {
        chatLog.push(msgObj);
        if (chatLog.length > 60) {
            chatLog.shift();
        }
    }
}
var commands = {
    help: {
        usage: "!help",
        help: "Displays this command list.",
        requiredPermission: false,
        do: function (args, fullMessage, socket) {
            var response = "";
            var isFirstLoop = true;
            for (command in commands) {
                if (!commands[command].requiredPermission || serverPlugins["Accounts"].hasPermission(socket.email, commands[command].requiredPermission)) {
                    if (!isFirstLoop) {
                        response += "<br><br>";
                    } else {
                        isFirstLoop = false;
                    }
                    response += command + ":<br>"
                    response += "   " + commands[command].usage + "<br>";
                    response += "   " + commands[command].help;
                }
            }
            sendServerPm(socket, response);
        }
    },
    server: {
        usage: "!server [message]",
        help: "Send a message as server.",
        requiredPermission: "command_server",
        do: function (args, fullMessage, socket) {
            sendServerBroadcast(fullMessage);
        }
    }
};
function handleCommand(command, args, fullMessage, socket) {
    if (command && commands[command]) {
        if (!commands[command].requiredPermission || serverPlugins["Accounts"].hasPermission(socket.email, commands[command].requiredPermission)) {
            commands[command].do(args, fullMessage, socket);
        } else {
            sendServerPm(socket, "You do not have permission to use this command.", 6000);
        }
    }
}
module.exports.init = init;
module.exports.sendServerBroadcast = sendServerBroadcast;
module.exports.sendServerPm = sendServerPm;
module.exports.sendPm = sendPm;
module.exports.sendMessage = sendMessage;
module.exports.commands = commands;