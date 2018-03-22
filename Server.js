//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/21/2018
//Version: 2.0.1

//Include Libs
var url = require('url');
var os = require('os');
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');
var mime = require('mime-types')
var DB = require('./Devlord_modules/DB.js');
var Throttle = require('throttle');
//
//Include DevLord Libs.
//
var Logging = require('./Devlord_modules/Logging.js');
Logging.setNamespace('Server');
Logging.logConsole(false);

var cc = require('./Devlord_modules/conColors.js');
var cs = require('./Devlord_modules/conSplash.js');

if (fs.existsSync("./config.json")) {
    var settings = DB.load("./config.json")
} else {
    var settings = {
        IP: "0.0.0.0",
        PORT: 80,
        HTTP_TIMEOUT_MS: 5000,
        maxPostSizeMB: 8,
        bitRateKB: 51000,
        maxUrlLength: 2048,
        "X-Frame-Options": "SAMEORIGIN",
        "X-XSS-Protection": "1; mode=block",
        "X-Content-Type-Options": "nosniff",
        webRoot: "./WebRoot",
        directoryIndex: ["index.html"],
        blockedPaths: [],
        blockedFiles: [],
        blockedFileNames: [],
        blockedFileExtensions: []
    }
    DB.save("./config.json", settings)
}

var commands = {}
commands.exit = function () {
    process.exit()
}
var events = {
    "connection": [],
    "disconnect": [],
    "post": [],
    "get": [],
    "on": function (event, callback) {
        if (this[event] != null) {
            this[event].push(callback)
        } else {
            Logging.log("Event '" + event + "' is not found.", true, "Server")
        }
    }
};

var server = http.createServer(Http_HandlerNew)
server.timeout = settings.HTTP_TIMEOUT_MS;

var io = require('socket.io')(server);
io.connectioncount = 0;
io.clientcount = 0;
io.IP_BAN_LIST = [];
io.generate_key = function () {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
}
io.on('error', function (err) {
    Logging.log(err, true, "IO");
});
io.on('uncaughtException', function (err) {
    Logging.log(err, true, "IO");
});
io.on('connection', function (socket) {
    if (socket.request.connection.remoteAddress in io.IP_BAN_LIST) {
        Logging.log("[" + socket.request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + io.IP_BAN_LIST[socket.request.connection.remoteAddress].reason + ")", true, "IO");
        Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.red + " REJECTED! " + "IP address is banned. '" + io.IP_BAN_LIST[socket.request.connection.remoteAddress].reason + "'", true, "IO");
        socket.disconnect()
    } else {
        Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.green + " connected!", false, "IO");
        io.connectioncount++
            io.clientcount++
            for (i in events["connection"]) {
                events["connection"][i](socket)
            }
        io.emit('connectionCount', io.clientcount)
        socket.on('disconnect', function (data) {
            Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.yellow + " disconnected...", false, "IO");
            io.clientcount--;
            for (i in events["disconnect"]) {
                events["disconnect"][i](socket)
            }
            io.emit('connectionCount', io.clientcount)
        });
    }
})

Logging.log("Loading plugins...", false, "Server")
var plugins = require('require-all')({
    dirname: __dirname + '/Plugins',
    recursive: false
});
for (var i in plugins) {
    Logging.log("Plugin '" + i + "' loaded.", false, "Server")
    plugins[i].init(settings, events, io, Logging.log, commands);
}

function Http_HandlerNew(request, response) {
    if (request.method == 'POST') {
        var body = '';
        var received = 0;
        if (request.url.length < settings.maxUrlLength) {
            request.on('data', function (data) {
                body += data;
                received += data.length;
                if (received > settings.maxPostSizeMB * 1000000) {
                    Logging.log("<POST> '" + reqPath + "' too large!", true);
                    request.destroy();
                    response.writeHead(413)
                    response.end()
                }
            });
            request.on('end', function () {
                var urlParts = url.parse(request.url);
                var reqPath = urlParts.pathname;
                Logging.log("<POST> '" + reqPath + "'");
                for (i in events["post"]) {
                    if (events["post"][i](request, response, urlParts, body)) {
                        break;
                    }
                }
            });
        } else {
            Logging.log("<GET> Uri too long!", true);
            response.writeHead(414)
            response.end()
        }
    } else if (request.method == 'GET') {
        var pluginHandledRequest = false;
        var urlParts = url.parse(request.url);
        var reqPath = urlParts.pathname;
        if (request.url.length <= settings.maxUrlLength) {
            var fullPath = settings.webRoot + reqPath
            try {
                var requestIsPath = fs.lstatSync(fullPath).isDirectory()
            } catch (err) {
                var requestIsPath = true;
            }
            for (i in events["get"]) {
                if (events["get"][i](request, response, urlParts, requestIsPath)) {
                    pluginHandledRequest = true;
                    break;
                }
            }
            if (!pluginHandledRequest) {
                if (requestIsPath) {
                    if (reqPath.substr(reqPath.length - 1) != "/") {
                        reqPath = reqPath + "/"
                    }
                    for (i in settings.directoryIndex) {
                        testPath = reqPath + "" + settings.directoryIndex[i]
                        if (fs.existsSync(settings.webRoot + testPath)) {
                            reqPath = testPath
                            requestIsPath = false;
                            break;
                        }
                    }
                }
                fullPath = settings.webRoot + reqPath
                if (!requestIsPath && fs.existsSync(fullPath)) {
                    var filename = fullPath.replace(/^.*[\\\/]/, '')
                    var directory = fullPath.substring(0, fullPath.lastIndexOf("/"));
                    if (!settings.blockedPaths.includes(directory) && !settings.blockedFiles.includes(fullPath) && !settings.blockedFileNames.includes(filename) && !settings.blockedFileExtensions.includes(fullPath.split('.').pop())) {
                        var stat = fs.statSync(fullPath);
                        var total = stat.size;
                        if (request.headers['range']) {
                            var range = request.headers.range;
                            var parts = range.replace(/bytes=/, "").split("-");
                            var partialstart = parts[0];
                            var partialend = parts[1];
                            var start = parseInt(partialstart, 10);
                            var end = partialend ? parseInt(partialend, 10) : total - 1;
                            var chunksize = (end - start) + 1;
                            Logging.log("<GET>'" + fullPath + "' byte range " + start + "-" + end);
                            if (start >= 0 && end < total) {
                                var contentType = mime.lookup(reqPath)
                                response.writeHead(206, {
                                    'X-Frame-Options': settings["X-Frame-Options"],
                                    "X-XSS-Protection": settings["X-XSS-Protection"],
                                    "X-Content-Type-Options": settings["X-Content-Type-Options"],
                                    'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                                    'Accept-Ranges': 'bytes',
                                    'Content-Length': chunksize,
                                    'Content-Type': contentType
                                });
                                try {
                                    var file = fs.createReadStream(fullPath, {
                                        start: start,
                                        end: end
                                    });
                                    file.pipe(new Throttle(settings.bitRateKB * 1000)).pipe(response);
                                    var contentCategory = contentType.split("/")[0]
                                    if (contentCategory == "video" || contentCategory == "audio" || contentCategory == "image" || contentCategory == "application") {
                                        file.pipe(new Throttle(settings.bitRateKB * 1000)).pipe(response);
                                    } else {
                                        file.pipe(response);
                                    }
                                } catch (err) {
                                    Logging.log("'" + fullPath + "' " + err, true);
                                }

                            } else {
                                Logging.log("<GET> '" + reqPath + "' Invalid byte range!", true);
                                response.writeHead(416)
                                response.end()
                            }
                        } else {
                            Logging.log("<GET> '" + reqPath + "'");
                            var contentType = mime.lookup(reqPath)
                            if (contentType.split)
                                response.writeHead(200, {
                                    'X-Frame-Options': settings["X-Frame-Options"],
                                    "X-XSS-Protection": settings["X-XSS-Protection"],
                                    "X-Content-Type-Options": settings["X-Content-Type-Options"],
                                    'Content-Length': total,
                                    'Content-Type': contentType
                                });
                            try {
                                var contentCategory = contentType.split("/")[0]
                                if (contentCategory == "video" || contentCategory == "audio" || contentCategory == "image" || contentCategory == "application") {
                                    fs.createReadStream(fullPath).pipe(new Throttle(settings.bitRateKB * 1000)).pipe(response);
                                } else {
                                    fs.createReadStream(fullPath).pipe(response);
                                }
                            } catch (err) {
                                Logging.log("'" + fullPath + "' " + err, true);
                            }
                        }
                    } else {
                        Logging.log("<GET> '" + reqPath + "' ACCESS DENIED!", true);
                        response.writeHead(403)
                        response.end()
                    }
                } else {
                    Logging.log("<GET> '" + reqPath + "' not found!", true);
                    response.writeHead(404)
                    response.end()
                }
            }
        } else {
            Logging.log("<GET> Uri too long!", true);
            response.writeHead(414)
            response.end()
        }
    } else if (request.method == 'BREW') {
        response.writeHead(418)
        response.end()
    } else {
        Logging.log("<UNKOWN METHOD> '" + request.method + "'", true);
        response.writeHead(501)
        response.end()
    }
}

server.on('error', function (err) {
    Logging.log(err, true, "Server");
});
server.on('uncaughtException', function (err) {
    Logging.log(err, true, "Server");
});

Logging.log("Starting server at '" + settings.IP + ":" + settings.PORT + "'...", false, "Server");
server.listen(settings.PORT, settings.IP);

process.stdin.on('data', function (line) {
    var message = line.toString().replace("\r\n", "").replace("\n", "")
    var messageLowercase = message.toLowerCase();
    var arguments = messageLowercase.split("");
    arguments.shift()
    //Commands
    if (commands[messageLowercase] != null) {
        commands[messageLowercase](message, messageLowercase, arguments);
    } else if (commands[messageLowercase.split(" ")[0]] != null) {
        commands[messageLowercase.split(" ")[0]](message, messageLowercase, arguments);
    } else {
        Logging.log("Unknown command '" + messageLowercase + "'.")
    }
});