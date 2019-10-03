//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../../Devlord_modules/DB.js');
var bcrypt = require('bcryptjs');
var persistentLoginTimeout = 864000000
//Load DBS
var accountDBPath = __dirname + "/Accounts.json";
if (fs.existsSync(accountDBPath)) {
    var Accounts = DB.load(accountDBPath)
} else {
    var Accounts = {}
    DB.save(accountDBPath, Accounts)
}
var accountSettingsPath = __dirname + "/settings.json"
if (fs.existsSync(accountSettingsPath)) {
    var settings = DB.load(accountSettingsPath)
} else {
    var settings = {}
    DB.save(accountSettingsPath, settings)
}
var permissionGroupsPath = __dirname + "/permissionGroups.json";
if (fs.existsSync(permissionGroupsPath)) {
    var permissionGroups = DB.load(permissionGroupsPath)
} else {
    var permissionGroups = {
        admin: {
            permissions: []
        },
        moderator: {
            permissions: []
        }
    }
    DB.save(permissionGroupsPath, permissionGroups);
}
function reloadAccounts() {
    Accounts = DB.load(accountDBPath);
    exports.Accounts = Accounts;
}
function init(exports, settings, events, io, log, commands, workerIo) {
    function isLoggedInElsewhere(socket) {
        var sockets = io.sockets.sockets;
        for (var socketId in sockets) {
            var socketIt = sockets[socketId];
            if (socketIt.isLoggedIn && socketIt.email == socket.email) {
                return true;
            }
        }
    }
    commands.reloadaccounts = {
        usage: "reloadaccounts",
        help: "Reloads accounts from the data file.",
        do: function () {
            reloadAccounts();
            log("Account data refreshed from data file.", false, "Accounts");
        }
    };
    events.on("disconnect", function (socket) {
        socket.isLoggedIn = false;
        if (!isLoggedInElsewhere(socket) && socket.email != "") {
            io.emit("userLoggedOff", socket.email);
        }
        socket.email = "";
    }, "Accounts"); //Flag which plugin this event belongs too
    events.on("connection", function (socket) {
        socket.isLoggedIn = false;
        socket.email = "";
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
                exports.Accounts = Accounts;
                io.emit("userLoggedOff", socket.email);
                socket.emit("forcelogout");
                log("'" + socket.email + "' has logged out.", false, "Accounts");
                socket.email = "";
            }
        });

        socket.on("login", function (data) {
            if (data) {
                if (data.email && data.email.length > 3 && data.email.includes("@")) {
                    if ((data.password && data.password.length > 3)) {
                        data.email = data.email.toLowerCase()
                        if (data.email in Accounts) {
                            bcrypt.hash(data.password, 8, function (err, hash) { });
                            bcrypt.compare(data.password, Accounts[data.email].password, function (err, passMatches) {

                                if (err) return;
                                if (passMatches) {
                                    socket.isLoggedIn = true;
                                    socket.email = data.email;
                                    socket.username = Accounts[data.email].username;
                                    socket.profilePicture = Accounts[data.email].profilePicture;
                                    socket.permissionGroups = Accounts[data.email].permissionGroups;
                                    Accounts[data.email].lastIp = socket.request.connection.remoteAddress;
                                    Accounts[data.email].lastLoginTS = Date.now();
                                    var loginKey = io.generate_key()
                                    Accounts[data.email].loginKeys[loginKey] = {
                                        ip: socket.request.connection.remoteAddress,
                                        timeout: Date.now() + persistentLoginTimeout
                                    }
                                    exports.Accounts = Accounts;
                                    DB.save(accountDBPath, Accounts);
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
                                    if (!isLoggedInElsewhere(socket)) {
                                        log("'" + socket.email + "' has logged in.", false, "Accounts");
                                    }
                                    cleanExpiredKeys(socket);
                                } else {
                                    log("'" + data.email + "' Login attempt failed, invalid password.", true, "Accounts");
                                    socket.emit("loginResponse", "failed")
                                }
                            });
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
                                Accounts[data.email].loginKeys[loginKey] = {
                                    ip: socket.request.connection.remoteAddress,
                                    timeout: Date.now() + persistentLoginTimeout
                                }
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
                                if (!isLoggedInElsewhere(socket)) {
                                    log("'" + data.email + "' has auto-logged in.", false, "Accounts");
                                }
                            } else {
                                log("Login attempt failed, key and ip combination do not match. '" + data.email + "'", true, "Accounts");
                            }
                            delete Accounts[data.email].loginKeys[data.persistentLoginKey];
                            exports.Accounts = Accounts;
                            DB.save(accountDBPath, Accounts);
                        }
                    }
                }
            }
        })
        socket.on("register", function (data) {
            if (data) {
                if (data.email && data.email.length > 6 && data.email.includes("@")) {
                    data.email = data.email.toLowerCase();
                    if (data.password && data.password.length > 3) {
                        if (data.username && data.username.length > 2 && !data.username.includes(" ") && !data.username.includes("   ")) {
                            if (!(data.email in Accounts)) {
                                if (!userExists(data.username)) {
                                    bcrypt.hash(data.password, 8, function (err, hash) {
                                        Accounts[data.email] = {};
                                        Accounts[data.email].username = data.username;
                                        Accounts[data.email].password = hash;
                                        Accounts[data.email].accountCreationTS = Date.now();
                                        Accounts[data.email].profilePicture = "/img/profilePics/noprofilepic.jpg";
                                        Accounts[data.email].loginKeys = {};
                                        Accounts[data.email].permissionGroups = [];
                                        Accounts[data.email].permissions = [];
                                        DB.save(accountDBPath, Accounts);
                                        exports.Accounts = Accounts;
                                        socket.emit("registerResponse", "registered");
                                        log("Account '" + data.email + "' was registered.", false, "Accounts");
                                    });
                                } else {
                                    socket.emit("registerResponse", "usernameExists");
                                }
                            } else {
                                socket.emit("registerResponse", "emailExists");
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
        });
        socket.on("changeProfilePicture", function (imageData) {
            if (socket.isLoggedIn) {
                var pMime = base64MimeType(imageData);
                var imgExt = ""
                if (pMime == "image/png") {
                    imgExt = ".png"
                    imageData = imageData.replace(/^data:image\/png;base64,/, "");
                } else if (pMime == "image/jpeg") {
                    imgExt = ".jpg"
                    imageData = imageData.replace(/^data:image\/jpeg;base64,/, "");
                } else if (pMime == "image/gif") {
                    imgExt = ".gif"
                    imageData = imageData.replace(/^data:image\/gif;base64,/, "");
                } else {
                    socket.emit("changeProfilePicture");
                    return;
                }
                var newPhotoPath = "/img/profilePics/" + socket.username + imgExt
                fs.writeFile(settings.webRoot + newPhotoPath, imageData, 'base64', function (err) {
                    if (err) {
                        socket.emit("changeProfilePicture");
                    } else {
                        socket.emit("changeProfilePicture", newPhotoPath);
                        log("Profile picture updated for '" + socket.email + "'.", false, "Accounts");
                        Accounts[socket.email].profilePicture = newPhotoPath;
                        socket.profilePicture = newPhotoPath;
                        DB.save(accountDBPath, Accounts);
                        exports.Accounts = Accounts;
                    }
                });
            }
        });
        socket.on("setProfilePictureUrl", function (newPhotoPath) {
            if (socket.isLoggedIn) {
                socket.emit("changeProfilePicture", newPhotoPath);
                log("Profile picture updated for '" + socket.email + "'.", false, "Accounts");
                Accounts[socket.email].profilePicture = newPhotoPath;
                socket.profilePicture = newPhotoPath;
                DB.save(accountDBPath, Accounts);
                exports.Accounts = Accounts;
            }
        });
    }, "Accounts"); //Flag which plugin this event belongs too
}
function base64MimeType(encoded) {
    var result = null;

    if (typeof encoded !== 'string') {
        return result;
    }

    var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

    if (mime && mime.length) {
        result = mime[1];
    }

    return result;
}
function cleanExpiredKeys(socket) {
    if (Accounts[socket.email] && Accounts[socket.email].loginKeys) {
        for (lKey in Accounts[socket.email].loginKeys) {
            var key = Accounts[socket.email].loginKeys[lKey];
            if (key.ip != socket.request.connection.remoteAddress && Date.now() >= key.timeout) {
                delete key;
            }
        }
    }
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

function hasPermissionGroup(email, group) {
    return Accounts[email].permissionGroups.includes(group);
}

function userExists(username) {
    var usernameExists = false;
    for (emailadd in Accounts) {
        if (Accounts[emailadd].username == username) {
            return true;
        }
    }
}

function addPermission(email, permission) {
    if (!Accounts[email].permissions.includes(permission)) {
        Accounts[email].permissions.push(permission);
        delete permissionsCache[email];
        DB.save(accountDBPath, Accounts)
        exports.Accounts = Accounts;
        return true;
    }
    return false;
}

function addGroup(email, group) {
    if (!Accounts[email].permissionGroups.includes(group)) {
        Accounts[email].permissionGroups.push(group);
        delete permissionsCache[email];
        DB.save(accountDBPath, Accounts)
        exports.Accounts = Accounts;
        return true;
    }
    return false;
}

function removePermission(email, permission) {
    if (Accounts[email].permissions.includes(permission)) {
        var index = Accounts[email].permissionGroups.indexOf(group);
        if (index > -1) {
            Accounts[email].permissionGroups.splice(index, 1);
            delete permissionsCache[email];
            DB.save(accountDBPath, Accounts)
            exports.Accounts = Accounts;
            return true;
        }
    }
    return false;
}

function removeGroup(email, group) {
    if (Accounts[email].permissionGroups.includes(group)) {
        var index = Accounts[email].permissionGroups.indexOf(group);
        if (index > -1) {
            Accounts[email].permissionGroups.splice(index, 1);
            delete permissionsCache[email];
            DB.save(accountDBPath, Accounts)
            exports.Accounts = Accounts;
            return true;
        }
    }
    return false;
}

function getUserEmail(username) {
    for (email in Accounts) {
        if (Accounts[email].username.toLowerCase() == username.toLowerCase()) return email;
    }
    return false;
}
function uninit(events, io, log, commands) {
    //disconnect all sockets
    var sockets = Object.values(io.of("/").connected);
    for (var socketId in sockets) {
        var socket = sockets[socketId];
        socket.disconnect(true);
    }
    delete commands.reloadaccounts;
}
exports.init = init;
exports.uninit = uninit;
exports.getPermissions = getPermissions;
exports.hasPermission = hasPermission;
exports.hasPermissionGroup = hasPermissionGroup;
exports.addGroup = addGroup;
exports.addPermission = addPermission;
exports.removePermission = removePermission;
exports.removeGroup = removeGroup;
exports.getUserEmail = getUserEmail;
exports.Accounts = Accounts