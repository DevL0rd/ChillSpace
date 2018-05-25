//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
var persistentLoginTimeout = 864000000
//Load DBS
var accountDBPath = __dirname + "/Accounts/Accounts.json";
if (fs.existsSync(accountDBPath)) {
    var Accounts = DB.load(accountDBPath)
} else {
    var Accounts = {}
    DB.save(accountDBPath, Accounts)
}
var accountSettingsPath = __dirname + "/Accounts/Account_Settings.json"
if (fs.existsSync(accountSettingsPath)) {
    var Account_Settings = DB.load(accountSettingsPath)
} else {
    var Account_Settings = {}
    DB.save(accountSettingsPath, Account_Settings)
}
var permissionGroupsPath = __dirname + "/Accounts/permissionGroups.json";
if (fs.existsSync(permissionGroupsPath)) {
    var permissionGroups = DB.load(permissionGroupsPath)
} else {
    var permissionGroups = {
        admin: { permissions: [] },
        moderator: { permissions: [] }
    }
    DB.save(permissionGroupsPath, permissionGroups);
}


function init(plugins, settings, events, io, log, commands) {
    commands.test = function (message, messageLowercase, arguments) {
        log("Test", false, "Test");
    }

    events.on("disconnect", function (socket) {
        socket.isLoggedIn = false;
        var sockets = io.sockets.sockets;
        var isLoggedInElsewhere = false;
        for (var socketId in sockets) {
            var socketIt = sockets[socketId];
            if (socketIt.isLoggedIn && socketIt.email == socket.email) {
                isLoggedInElsewhere = true;
                break;
            }
        }
        if (!isLoggedInElsewhere && socket.email != "") {
            io.emit("userLoggedOff", socket.email)
            io.emit("newMessage", {
                username: "Server",
                msg: "'" + socket.username + "' has logged out."
            })
        }
        socket.email = "";
    })
    events.on("connection", function (socket) {
        socket.isLoggedIn = false;
        socket.email = "";
        socket.on('ping', function (data) {
            socket.emit('pong', {});
        });

        socket.on("getPermissions", function () {
            if (socket.isLoggedIn) {
                socket.emit("getPermissions", getPermissions(socket.email));
            }
        });
        socket.on("getProfilePicture", function (email) {
            if (Accounts[email]) {
                socket.emit("getProfilePicture", Accounts[email].profilePicture);
            }
        });
        socket.on("logout", function () {
            if (socket.isLoggedIn) {
                Accounts[socket.email].loginKeys = {};
                socket.isLoggedIn = false;
                DB.save(accountDBPath, Accounts);
                io.emit("userLoggedOff", socket.email);
                socket.emit("forcelogout");
                log("'" + socket.email + "' has logged out.", false, "Accounts");
                socket.email = "";
                io.emit("newMessage", {
                    username: "Server",
                    msg: "'" + socket.username + "' has logged out."
                });
            }
        });

        socket.on("login", function (data) {
            if (data) {
                if (data.email && data.email.length > 3 && data.email.includes("@")) {
                    if ((data.password && data.password.length > 3)) {
                        data.email = data.email.toLowerCase()
                        if (data.email in Accounts) {
                            if (Accounts[data.email].password == data.password) {
                                socket.isLoggedIn = true;
                                socket.email = data.email;
                                socket.username = Accounts[data.email].username;
                                socket.profilePicture = Accounts[data.email].profilePicture;
                                socket.permissionGroups = Accounts[data.email].permissionGroups;
                                Accounts[data.email].lastIp = socket.request.connection.remoteAddress;
                                Accounts[data.email].lastLoginTS = Date.now();
                                var loginKey = io.generate_key()
                                Accounts[data.email].loginKeys[loginKey] = { ip: socket.request.connection.remoteAddress, timeout: Date.now() + persistentLoginTimeout }
                                DB.save(accountDBPath, Accounts)
                                socket.emit("loginResponse", {
                                    persistentLoginKey: loginKey,
                                    username: socket.username,
                                    profilePicture: socket.profilePicture
                                })
                                io.emit("userLoggedOn", {
                                    email: data.email,
                                    username: socket.username,
                                    profilePicture: socket.profilePicture
                                })
                                var sockets = io.sockets.sockets;
                                var isLoggedInElsewhere = false;
                                for (var socketId in sockets) {
                                    var socketIt = sockets[socketId];
                                    if (socketIt != socket && socketIt.isLoggedIn && socketIt.email == data.email) {
                                        isLoggedInElsewhere = true;
                                        break;
                                    }
                                }
                                if (!isLoggedInElsewhere) {
                                    log("'" + socket.email + "' has logged in.", false, "Accounts");
                                    io.emit("newMessage", {
                                        username: "Server",
                                        msg: "'" + socket.username + "' has logged in."
                                    })
                                }
                            } else {
                                log("'" + data.email + "' Login attempt failed, invalid password.", true, "Accounts");
                                socket.emit("loginResponse", "failed")
                            }
                        } else {
                            log("Login attempt failed, account not found. '" + data.email + "'", false, "Accounts");
                            socket.emit("loginResponse", "failed")
                        }
                    }
                }
            }
        })
        socket.on("autologin", function (data) {
            if (data) {
                if (data.email) {
                    data.email = data.email.toLowerCase()
                    if (data.persistentLoginKey) {
                        if (data.email in Accounts && data.persistentLoginKey in Accounts[data.email].loginKeys) {

                            if (Accounts[data.email].loginKeys[data.persistentLoginKey].ip == socket.request.connection.remoteAddress && Date.now() < Accounts[data.email].loginKeys[data.persistentLoginKey].timeout) {

                                socket.isLoggedIn = true;
                                socket.email = data.email;
                                socket.username = Accounts[data.email].username;

                                socket.permissionGroups = Accounts[data.email].permissionGroups;
                                socket.profilePicture = Accounts[data.email].profilePicture;
                                Accounts[data.email].lastIp = socket.request.connection.remoteAddress;
                                Accounts[data.email].lastLoginTS = Date.now();
                                var loginKey = io.generate_key()
                                Accounts[data.email].loginKeys[loginKey] = { ip: socket.request.connection.remoteAddress, timeout: Date.now() + persistentLoginTimeout }
                                socket.emit("loginResponse", {
                                    persistentLoginKey: loginKey,
                                    username: socket.username,
                                    profilePicture: socket.profilePicture
                                })
                                io.emit("userLoggedOn", {
                                    email: data.email,
                                    username: socket.username,
                                    profilePicture: socket.profilePicture
                                })
                                var sockets = io.sockets.sockets;
                                var isLoggedInElsewhere = false;
                                for (var socketId in sockets) {
                                    var socketIt = sockets[socketId];
                                    if (socketIt != socket && socketIt.isLoggedIn && socketIt.email == data.email) {
                                        isLoggedInElsewhere = true;
                                        break;
                                    }

                                }
                                if (!isLoggedInElsewhere) {
                                    log("'" + data.email + "' has auto-logged in.", false, "Accounts");
                                    io.emit("newMessage", {
                                        username: "Server",
                                        msg: "'" + socket.username + "' has logged in."
                                    })
                                }
                            } else {
                                log("Login attempt failed, key and ip combination do not match. '" + data.email + "'", true, "Accounts");
                            }
                            delete Accounts[data.email].loginKeys[data.persistentLoginKey];
                            DB.save(accountDBPath, Accounts);
                        }
                    }
                }
            }
        })
        socket.on("register", function (data) {
            if (data) {
                if (data.email && data.email.length > 6 && data.email.includes("@")) {
                    data.email = data.email.toLowerCase()
                    if (data.password && data.password.length > 3) {
                        if (data.username && data.username.length > 2 && !data.username.includes(" ") && !data.username.includes("   ")) {
                            if (!(data.email in Accounts)) {
                                if (!userExists(data.username)) {
                                    Accounts[data.email] = {}
                                    Accounts[data.email].username = data.username;
                                    Accounts[data.email].password = data.password;
                                    Accounts[data.email].accountCreationTS = Date.now();
                                    Accounts[data.email].profilePicture = "/img/profilePics/noprofilepic.jpg"
                                    Accounts[data.email].loginKeys = {}
                                    Accounts[data.email].permissionGroups = [];
                                    Accounts[data.email].permissions = [];
                                    DB.save(accountDBPath, Accounts)
                                    socket.emit("registerResponse", "registered")
                                    log("Account '" + data.email + "' was registered.", false, "Accounts");
                                } else {
                                    socket.emit("registerResponse", "usernameExists")
                                }
                            } else {
                                socket.emit("registerResponse", "emailExists")
                            }
                        }
                    }
                }
            }
        })
        socket.on("unregister", function () {
            if (socket.isLoggedIn) {
                delete Accounts[socket.email]
                log("Account '" + socket.email + "' was removed.", false, "Accounts");
                socket.emit("unregistered")
            }
        })

        socket.on("updateUsers", function () {
            var sockets = io.sockets.sockets;
            for (var socketId in sockets) {
                var socketIt = sockets[socketId];
                if (socketIt.isLoggedIn) {
                    socket.emit("updateUser", {
                        email: socketIt.email,
                        username: socketIt.username,
                        profilePicture: socketIt.profilePicture

                    })
                }

            }
        })
    })
}
var permissionsCache = {}
function getPermissions(email) {
    if (!permissionsCache[email]) {
        var usersPermGroups = Accounts[email].permissionGroups;
        var permissions = Accounts[email].permissions;
        for (g in usersPermGroups) {
            var gName = usersPermGroups[g]
            if (permissionGroups[gName]) {
                permissions = permissions.concat(permissionGroups[gName].permissions);
            }
        }
        permissionsCache[email] = permissions;
    }
    return permissionsCache[email];
}
function hasPermission(email, permissionString) {
    return getPermissions(email).includes(permissionString);
}
function userExists(username) {
    var usernameExists = false;
    for (emailadd in Accounts) {
        if (Accounts[emailadd].username == username) {
            return true;
        }
    }
}
exports.init = init;
exports.getPermissions = getPermissions;
exports.hasPermission = hasPermission;