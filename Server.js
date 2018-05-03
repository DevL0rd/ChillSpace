//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 4/19/2018
//Version: 2.1.1

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
Logging.setNamespace('HTTP');



var cc = require('./Devlord_modules/conColors.js');
var cs = require('./Devlord_modules/conSplash.js');

if (fs.existsSync("./config.json")) {
    var settings = DB.load("./config.json")
} else {
    var settings = {
        IP: "0.0.0.0",
        PORT: 80,
        timeout: 5000,
        maxHeadersCount: 20,
        maxPostSizeMB: 8,
        maxUrlLength: 2048,
        directoryIndex: ["index.html"],
        webRoot: "./WebRoot",
        throttling: {
            videoBitRateKB: 51000,
            audioBitRateKB: 230,
            applicationDownloadThrottleMB: 15,
        },
        defaultHeaders: {
            "Cache-Control": "max-age=0",
            "X-Frame-Options": "SAMEORIGIN",
            "X-XSS-Protection": "1; mode=block",
            "X-Content-Type-Options": "nosniff"
        },
        security: {
            blockedPaths: [],
            blockedFiles: [],
            blockedFileNames: [],
            blockedFileExtensions: []
        },
        logging: {
            enabled: true,
            directory: "./Logs",
            consoleLoggingEnabled: false,
            errorLoggingEnabled: true,
            printConsole: true,
            printErrors: true,
            consoleNamespacePrintFilter: ["HTTP"],
            errorNamespacePrintFilter: []
        }
    }
    DB.save("./config.json", settings)
}

Logging.setLoggingDir(settings.logging.directory);
Logging.setLogging(settings.logging.enabled);
Logging.logConsole(settings.logging.consoleLoggingEnabled);
Logging.logErrors(settings.logging.errorLoggingEnabled);
Logging.printConsole(settings.logging.printConsole);
Logging.printErrors(settings.logging.printErrors);
Logging.setConsoleNamespacePrintFilter(settings.logging.consoleNamespacePrintFilter);
Logging.setErrorNamespacePrintFilter(settings.logging.errorNamespacePrintFilter);

if (fs.existsSync("./routes.json")) {
    var routes = DB.load("./routes.json");
} else {
    var routes = {
        GET: {
            "/route/": "/"
        }
    }
    DB.save("./routes.json", routes)
}

if (fs.existsSync("./redirects.json")) {
    var redirects = DB.load("./redirects.json")
} else {
    var redirects = {
        "/redirect/": "/"
    }
    DB.save("./redirects.json", redirects)
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

var server = http.createServer(function (request, response) {
    setTimeout(function () {
        try {
            Http_Handler(request, response);
        } catch (err) {
            response.writeHead(500)
            response.end()
            if (err.message) {
                Logging.log("'" + request.url + "' " + err.message + ".\n" + err.stack, true);
            }
        }
    }, 0)
})
server.timeout = settings.timeout;
server.maxHeadersCount = settings.maxHeadersCount;
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
    Logging.log("ERROR: " + err, true, "IO");
});
io.on('uncaughtException', function (err) {
    Logging.log("ERROR: " + err, true, "IO");
});
io.on('connection', function (socket) {
    if (socket.request.connection.remoteAddress in io.IP_BAN_LIST) {
        Logging.log("[" + socket.request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + io.IP_BAN_LIST[socket.request.connection.remoteAddress].reason + ")", true, "IO");
        Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.red + " REJECTED! " + "IP address is banned. '" + io.IP_BAN_LIST[socket.request.connection.remoteAddress].reason + "'", true, "IO");
        socket.disconnect()
        return;
    }
    io.connectioncount++;
    io.clientcount++;
    Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.green + " connected!" + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
    Logging.setNamespace('Plugin');
    for (i in events["connection"]) {
        events["connection"][i](socket)
    }
    Logging.setNamespace('HTTP');
    io.emit('connectionCount', io.clientcount)
    socket.on('disconnect', function (data) {
        io.clientcount--;
        Logging.log(cc.fg.white + "[" + cc.fg.cyan + socket.request.connection.remoteAddress + cc.fg.white + "]" + cc.fg.yellow + " disconnected..." + cc.fg.white + " " + io.clientcount + " clients connected.", false, "IO");
        Logging.setNamespace('Plugin');
        for (i in events["disconnect"]) {
            events["disconnect"][i](socket)
        }
        Logging.setNamespace('HTTP');
        io.emit('connectionCount', io.clientcount)
    });
})

Logging.log("Loading plugins...", false, "Server")
var plugins = require('require-all')({
    dirname: __dirname + '/Plugins',
    recursive: false
});
for (var i in plugins) {
    Logging.log("Plugin '" + i + "' loaded.", false, "Server")
    Logging.setNamespace('Plugin');
    plugins[i].init(plugins, settings, events, io, Logging.log, commands);
    Logging.setNamespace('HTTP');
}

function Http_Handler(request, response) {
    var startTime = new Date().getTime();
    if (request.url.length >= settings.maxUrlLength) {
        Logging.log("Uri too long!", true);
        response.writeHead(414)
        response.end()
        return;
    }
    var urlParts = url.parse(request.url);
    var reqPath = decodeURI(urlParts.pathname);
    var requestIsPath = !reqPath.includes(".");
    if (requestIsPath && reqPath.substr(reqPath.length - 1) != "/") {
        response.writeHead(301, {
            'Location': reqPath + "/"
        });
        response.end()
        return;
    }
    if (routes[request.method] && routes[request.method][reqPath]) {
        reqPath = routes[request.method][reqPath]
    }
    if (redirects[reqPath]) {
        response.writeHead(301, {
            'Location': redirects[reqPath]
        });
        response.end()
        return;
    }
    if (request.method == 'POST') {
        var body = '';
        var received = 0;
        request.on('data', function (data) {
            body += data;
            received += data.length;
            if (received > settings.maxPostSizeMB * 1000000) {
                Logging.log("<POST> '" + reqPath + "' too large!", true);
                request.destroy();
                response.writeHead(413);
                response.end()
            }
        });
        request.on('end', function () {
            Logging.log("<POST> '" + reqPath + "'");
            Logging.setNamespace('Plugin');
            for (i in events["post"]) {
                if (events["post"][i](request, response, urlParts, body)) {
                    Logging.setNamespace('HTTP');
                    break;
                }
            }
            Logging.setNamespace('HTTP');
        });
    } else if (request.method == 'GET') {
        Logging.setNamespace('Plugin');
        for (i in events["get"]) {
            if (events["get"][i](request, response, urlParts)) {
                Logging.setNamespace('HTTP');
                return;
            }
        }
        Logging.setNamespace('HTTP');

        if (requestIsPath) {
            for (i in settings.directoryIndex) {
                testPath = reqPath + "" + settings.directoryIndex[i]
                if (fs.existsSync(settings.webRoot + testPath)) {
                    reqPath = testPath;
                    requestIsPath = false;
                    break;
                }
            }
        }

        var fullPath = settings.webRoot + reqPath
        if (requestIsPath) {
            Logging.log("<GET> '" + reqPath + "' not found!", true);
            response.writeHead(404);
            response.end();
            return;
        }
        if (isBlocked(reqPath)) {
            Logging.log("<GET> '" + reqPath + "' ACCESS DENIED!", true);
            response.writeHead(403);
            response.end();
            return;
        }
        fs.exists(fullPath, function (exists) {
            if (exists) {
                if (request.headers['range']) {
                    sendByteRange(reqPath, request, response, function (start, end) {
                        var executionTime = new Date().getTime() - startTime;
                        Logging.log("<GET> '" + reqPath + "' byte range " + start + "-" + end + " (" + executionTime + "ms)");
                    });
                } else {
                    sendFile(reqPath, request, response, function (isCached) {
                        var executionTime = new Date().getTime() - startTime;
                        var executionTime = new Date().getTime() - startTime;
                        if (isCached) {
                            Logging.log("<GET> (cached) '" + reqPath + "' (" + executionTime + "ms)");
                        } else {
                            Logging.log("<GET> '" + reqPath + "' (" + executionTime + "ms)");
                        }
                    });
                }
            } else {
                Logging.log("<GET> '" + reqPath + "' not found!", true);
                response.writeHead(404);
                response.end();
                return;
            }
        });
    } else if (request.method == 'BREW') {
        response.writeHead(418)
        response.end()
    } else {
        Logging.log("<UNKOWN METHOD> '" + request.method + "'", true);
        response.writeHead(501)
        response.end()
    }
}

function sendFile(reqPath, request, response, callback) {
    var fullPath = settings.webRoot + reqPath;
    fs.stat(fullPath, function (err, stat) {
        var reqModDate = request.headers["if-modified-since"];
        //remove milliseconds from modified date, some browsers do not keep the date that accurately.
        if (reqModDate && Math.floor(new Date(reqModDate).getTime() / 1000) == Math.floor(stat.mtime.getTime() / 1000)) {
            response.writeHead(304, {
                "Last-Modified": stat.mtime.toUTCString()
            });
            response.end();
            callback(true);
        } else {
            var mimeType = getMime(reqPath);
            var header = buildHeader(mimeType, stat);
            response.writeHead(200, header);
            var fileStream = fs.createReadStream(fullPath);
            pipeFileToResponse(fileStream, mimeType, response);
            fileStream.on('end', () => {
                callback(false);
            });
        }
    });
}

function buildHeader(mimeType, stat, otherOptions = {}) {
    var contentLength = stat.size;
    var lastModified = stat.mtime.toUTCString();
    var header = {
        'Content-Length': contentLength,
        'Content-Type': mimeType,
        "Last-Modified": lastModified
    };
    header = Object.assign(header, settings.defaultHeaders)
    header = Object.assign(header, otherOptions);
    return header;
}

function sendByteRange(reqPath, request, response, callback) {
    var fullPath = settings.webRoot + reqPath;
    fs.stat(fullPath, function (err, stat) {
        var total = stat.size;
        var range = request.headers.range;
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];
        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total - 1;
        var chunksize = (end - start) + 1;
        if (start >= 0 && end < total) {
            var mimeType = getMime(reqPath);
            var header = buildHeader(mimeType, stat, {
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Accept-Ranges': 'bytes'
            });
            response.writeHead(206, header);
            var fileStream = fs.createReadStream(fullPath, {
                start: start,
                end: end
            });
            pipeFileToResponse(fileStream, mimeType, response);
            fileStream.on('end', () => {
                callback(start, end);
            });
        } else {
            Logging.log("<GET> '" + reqPath + "' Invalid byte range!", true);
            response.writeHead(416);
            response.end();
        }
    });

}

function getMime(path) {
    return mime.lookup(path) || 'application/octet-stream';
}

function isBlocked(reqPath) {
    var filename = reqPath.replace(/^.*[\\\/]/, '')
    var directory = reqPath.substring(0, reqPath.lastIndexOf("/"));
    if (settings.security.blockedPaths.includes(directory) || settings.security.blockedFiles.includes(reqPath) || settings.security.blockedFileNames.includes(filename) || settings.security.blockedFileExtensions.includes(reqPath.split('.').pop())) {
        return true;
    }
    return false;
}

function pipeFileToResponse(fileStream, mimeType, response) {
    var contentCategory = mimeType.split("/")[0]
    if (contentCategory == "video") {
        fileStream.pipe(new Throttle(settings.throttling.videoBitRateKB * 1000)).pipe(response);
    } else if (contentCategory == "audio") {
        fileStream.pipe(new Throttle(settings.throttling.audioBitRateKB * 1000)).pipe(response);
    } else if (contentCategory == "application") {
        fileStream.pipe(new Throttle(settings.throttling.applicationDownloadThrottleMB * 1000000)).pipe(response);
    } else {
        fileStream.pipe(response);
    }
}
server.on('error', function (err) {
    Logging.log("ERROR: " + err, true, "Server");
});
server.on('uncaughtException', function (err) {
    Logging.log("ERROR: " + err, true, "Server");
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