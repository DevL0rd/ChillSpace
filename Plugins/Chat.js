//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
var chatLog = [];
var serverIo;
var serverPlugins;
var serverCommands;
var userDataPath = __dirname + "/Chat/userData.json";
var userData = {};
if (fs.existsSync(userDataPath)) {
    var userData = DB.load(userDataPath)
} else {
    DB.save(userDataPath, userData);
}

function init(plugins, settings, events, io, log, commands) {


    serverCommands = commands;
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
    var sockets = serverIo.sockets.sockets;
    for (var socketId in sockets) {
        var socketTo = sockets[socketId];
        if (userData[socketTo.email] && userData[socketTo.email].mutedUsers && userData[socketTo.email].mutedUsers[socket.email]) {

        } else {
            socketTo.emit("newMessage", msgObj);
        }
    }
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
var chatCommands = {
    help: {
        usage: "!help",
        help: "Displays this command list.",
        requiredPermission: false,
        do: function (args, fullMessage, socket) {
            var response = "";
            var isFirstLoop = true;
            for (command in chatCommands) {
                if (!chatCommands[command].requiredPermission || serverPlugins["Accounts"].hasPermission(socket.email, chatCommands[command].requiredPermission)) {
                    if (!isFirstLoop) {
                        response += "<br><br>";
                    } else {
                        isFirstLoop = false;
                    }
                    response += chatCommands[command].usage + "<br>";
                    response += "   " + chatCommands[command].help;
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
    },
    mod: {
        usage: "!mod [user]",
        help: "Make a user a moderator.",
        requiredPermission: "command_mod",
        do: function (args, fullMessage, socket) {
            if (!args.length || args.length != 1) {
                console.log("Usage: " + this.usage);
                return
            }
            var username = args[0];
            var email = serverPlugins["Accounts"].getUserEmail(username);
            if (email) {
                if (!serverPlugins["Accounts"].hasPermissionGroup(email, "moderator")) {
                    sendServerPm(socket, "User '" + username + "' was promoted to moderator!", 7000);
                    serverPlugins["Accounts"].removeGroup(email, "admin")
                    serverPlugins["Accounts"].addGroup(email, "moderator")
                } else {
                    sendServerPm(socket, "User '" + username + "' is already a moderator.");
                }
            } else {
                sendServerPm(socket, "User '" + username + "' does not exist.");
            }

        }
    },
    unmod: {
        usage: "!unmod [user]",
        help: "Remove moderator permissions from a user.",
        requiredPermission: "command_mod",
        do: function (args, fullMessage, socket) {
            if (!args.length || args.length != 1) {
                console.log("Usage: " + this.usage);
                return
            }
            var username = args[0];
            var email = serverPlugins["Accounts"].getUserEmail(username);
            if (email) {
                if (serverPlugins["Accounts"].hasPermissionGroup(email, "moderator")) {
                    sendServerPm(socket, "User '" + username + "' was demoted from moderator.", 7000);
                    serverPlugins["Accounts"].removeGroup(email, "moderator")
                } else {
                    sendServerPm(socket, "User '" + username + "' is not a moderator.");
                }
            } else {
                sendServerPm(socket, "User '" + username + "' does not exist.");
            }
        }
    },
    admin: {
        usage: "!admin [user]",
        help: "Make a user a admin.",
        requiredPermission: "command_admin",
        do: function (args, fullMessage, socket) {
            if (!args.length || args.length != 1) {
                console.log("Usage: " + this.usage);
                return
            }
            var username = args[0];
            var email = serverPlugins["Accounts"].getUserEmail(username);
            if (email) {
                if (!serverPlugins["Accounts"].hasPermissionGroup(email, "admin")) {
                    sendServerPm(socket, "User '" + username + "' was promoted to admin!", 7000);
                    serverPlugins["Accounts"].removeGroup(email, "moderator")
                    serverPlugins["Accounts"].addGroup(email, "admin")
                } else {
                    sendServerPm(socket, "User '" + username + "' is already a admin.");
                }
            } else {
                sendServerPm(socket, "User '" + username + "' does not exist.");
            }

        }
    },
    unadmin: {
        usage: "!unadmin [user]",
        help: "Remove admin permissions from a user.",
        requiredPermission: "command_admin",
        do: function (args, fullMessage, socket) {
            if (!args.length || args.length != 1) {
                console.log("Usage: " + this.usage);
                return;
            }
            var username = args[0];
            var email = serverPlugins["Accounts"].getUserEmail(username);
            if (email) {
                if (serverPlugins["Accounts"].hasPermissionGroup(email, "admin")) {
                    sendServerPm(socket, "User '" + username + "' was demoted from admin.", 7000);
                    serverPlugins["Accounts"].removeGroup(email, "admin")
                } else {
                    sendServerPm(socket, "User '" + username + "' is not a admin.");
                }
            } else {
                sendServerPm(socket, "User '" + username + "' does not exist.");
            }

        }
    },
    mute: {
        usage: "!mute [user]",
        help: "Mute a user. A user can be unmuted using !unmute.",
        requiredPermission: false,
        do: function (args, fullMessage, socket) {
            if (!args.length || args.length != 1) {
                console.log("Usage: " + this.usage);
                return;
            }
            var username = args[0];
            var email = serverPlugins["Accounts"].getUserEmail(username);
            if (email) {
                if (!userData[socket.email]) userData[socket.email] = {};
                if (!userData[socket.email].mutedUsers) userData[socket.email].mutedUsers = {};
                if (!userData[socket.email].mutedUsers[email]) {
                    userData[socket.email].mutedUsers[email] = true;
                    DB.save(userDataPath, userData);
                    sendServerPm(socket, "User '" + username + "' has been muted.", 6000);
                } else {
                    sendServerPm(socket, "User '" + username + "' has already been muted.", 6000);
                }
            } else {
                sendServerPm(socket, "User '" + username + "' does not exist.");
            }
            //continure here
        }
    },
    unmute: {
        usage: "!unmute [user]",
        help: "unmute a user.",
        requiredPermission: false,
        do: function (args, fullMessage, socket) {
            if (!args.length || args.length != 1) {
                console.log("Usage: " + this.usage);
                return;
            }
            var username = args[0];
            var email = serverPlugins["Accounts"].getUserEmail(username);
            if (email) {
                if (!userData[socket.email]) userData[socket.email] = {};
                if (!userData[socket.email].mutedUsers) userData[socket.email].mutedUsers = {};
                if (userData[socket.email].mutedUsers[email]) {
                    delete userData[socket.email].mutedUsers[email];
                    DB.save(userDataPath, userData);
                    sendServerPm(socket, "User '" + username + "' has been un-muted.", 6000);
                } else {
                    sendServerPm(socket, "User '" + username + "' is not muted.", 6000);
                }
            } else {
                sendServerPm(socket, "User '" + username + "' does not exist.");
            }
            //continure here
        }
    },
    ping: {
        usage: "!ping",
        help: "checks latency with server.",
        requiredPermission: false,
        do: function (args, fullMessage, socket) {
            sendServerPm(socket, "Pong!", 1000);
            //continure here
        }
    }
};

function handleCommand(command, args, fullMessage, socket) {
    if (command && chatCommands[command]) {
        if (!chatCommands[command].requiredPermission || serverPlugins["Accounts"].hasPermission(socket.email, chatCommands[command].requiredPermission)) {
            chatCommands[command].do(args, fullMessage, socket);
        } else {
            sendServerPm(socket, "You do not have permission to use this command.", 6000);
        }
    } else {
        sendServerPm(socket, "This command does not exist. Type '!help' for a list of commands.", 6000);
    }
}
exports.init = init;
exports.sendServerBroadcast = sendServerBroadcast;
exports.sendServerPm = sendServerPm;
exports.sendPm = sendPm;
exports.sendMessage = sendMessage;
exports.chatCommands = chatCommands;