//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/17/2018
//Version: 1.1.2

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
Logging.setNamespace('Console')
Logging.setConsoleLogging(false)

//Startup
Logging.log("Starting Up...");
//Load DBS
if (fs.existsSync("./config.json")) {
    var settings = DB.load("./config.json")
} else {
    var settings = {
        IP: "0.0.0.0",
        PORT: 80,
        HTTP_TIMEOUT_MS: 5000,
        maxPostSizeMB: 8,
        bitRateKB: 51000,
        maxChunkSizeKB: 51000,
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

var server = http.createServer(Http_HandlerNew)
var io = require('socket.io')(server);
server.timeout = settings.HTTP_TIMEOUT_MS;
//startServer
Logging.log("Starting server at '" + settings.IP + ":" + settings.PORT + "'...", false, "HTTP");
server.listen(settings.PORT, settings.IP);
io.generate_key = function () {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
}

function log(str, isError = false, nameSpace = "Server") {
    Logging.log(str, isError, nameSpace);
}

function isFile(pathname) {
    return pathname.split('/').pop().indexOf('.') > -1;
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
                    log("<POST> '" + reqPath + "' too large!", true, "HTTP");
                    request.destroy();
                    response.writeHead(413)
                    response.end()
                }
            });
            request.on('end', function () {

                var urlParts = url.parse(request.url);
                var reqPath = urlParts.pathname;
                log("<POST> '" + reqPath + "'", false, "HTTP");
                for (i in events["post"]) {
                    if (events["post"][i](request, response, urlParts, body)) {
                        break;
                    }
                }
            });
        } else {
            log("<GET> 414 Uri too long!", true, "HTTP");
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
                            if (start >= 0) {
                                var maxChunkInBytes = settings.maxChunkSizeKB * 1000
                                var defaultEnd = start + maxChunkInBytes;
                                var end = partialend ? parseInt(partialend, 10) : defaultEnd;
                                if (end > total - 1) {
                                    end = total - 1
                                }
                                var chunksize = (end - start) + 1;
                                if (chunksize > maxChunkInBytes) {
                                    end = start + maxChunkInBytes;
                                    if (end > total - 1) {
                                        end = total - 1
                                    }
                                    chunksize = (end - start) + 1;
                                }
                                log("<GET>'" + fullPath + "' with byte range " + start + "-" + end + " (" + chunksize + " bytes)", false, "HTTP");
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
                                } catch (err) {
                                    log("ERROR: '" + fullPath + "' " + err, true, "HTTP");
                                }

                            } else {
                                log("<GET> 416 '" + reqPath + "' Invalid byte range!", true, "HTTP");
                                response.writeHead(416)
                                response.end()
                            }
                        } else {

                            log("<GET> '" + reqPath + "'", false, "HTTP");
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
                                fs.createReadStream(fullPath).pipe(new Throttle(settings.bitRateKB * 1000)).pipe(response);
                            } catch (err) {
                                log("ERROR: '" + fullPath + "' " + err, true, "HTTP");
                            }


                        }
                    } else {

                        log("<GET> 403 '" + reqPath + "' ACCESS DENIED!", true, "HTTP");
                        response.writeHead(403)
                        response.end()
                    }
                } else {
                    log("<GET> 404 '" + reqPath + "' not found!", true, "HTTP");
                    response.writeHead(404)
                    response.end()
                }
            }
        } else {
            log("<GET> 414 Uri too long!", true, "HTTP");
            response.writeHead(414)
            response.end()
        }
    } else if (request.method == 'BREW') {
        response.writeHead(418)
        response.end()
    } else {
        log("<UNKOWN METHOD> 501 '" + request.method + "'", true, "HTTP");
        response.writeHead(501)
        response.end()
    }

}

server.on('error', function (err) {
    Logging.log(err, true, "HTTP");
});
server.on('uncaughtException', function (err) {
    Logging.log(err, true, "HTTP");
});
io.on('error', function (err) {
    Logging.log(err, true, "IO");
});
io.on('uncaughtException', function (err) {
    Logging.log(err, true, "IO");
});

//Statistics and io tracking
io.connectioncount = 0;
io.clientcount = 0;
io.IP_BAN_LIST = [];
var events = {
    "connection": [],
    "disconnect": [],
    "post": [],
    "get": [],
    "on": function (event, callback) {
        if (this[event] != null) {
            this[event].push(callback)
        } else {
            log("ERROR: Event '" + event + "' is not found.", true)
        }
    }
};
//on io connection, setup client dat
io.on('connection', function (socket) {
    //if connection is in ban list then show error and disconnect socket
    if (socket.request.connection.remoteAddress in io.IP_BAN_LIST) {
        log("[" + socket.request.connection.remoteAddress + "] Rejected!" + " IP address is banned. (" + io.IP_BAN_LIST[socket.request.connection.remoteAddress].reason + ")", true, "IO");
        socket.disconnect()

    } else {
        log("[" + socket.request.connection.remoteAddress + "] Connected! ", false, "IO");
        io.connectioncount++
            io.clientcount++
            for (i in events["connection"]) {
                events["connection"][i](socket)
            }
        io.emit('connectionCount', io.clientcount)
        socket.on('disconnect', function (data) {
            log("[" + this.request.connection.remoteAddress + "] Disconnected", false, "IO");
            io.clientcount--;
            for (i in events["disconnect"]) {
                events["disconnect"][i](socket)
            }
            io.emit('connectionCount', io.clientcount)

        });
    }
})

var plugins = require('require-all')({
    dirname: __dirname + '/Plugins',
    recursive: false
});
var commands = {}
commands.exit = function () {
    process.exit()
}
Logging.log("Loading DevL0rd Plugins...")
for (var i in plugins) {
    Logging.log("Plugin '" + i + "' loaded.")
    plugins[i].init(settings, events, io, log, commands);
}
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