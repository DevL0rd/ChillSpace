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
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {

            log("<POST> " + body, false, "HTTP");
            for (i in events["post"]) {
                events["post"][i](request, response, data);
            }
        });


    } else if (request.method == 'GET') {
        var reqPath = url.parse(request.url).pathname;
        var requestIsPath = !isFile(reqPath)
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
        var fullPath = settings.webRoot + reqPath
        if (!requestIsPath && fs.existsSync(fullPath)) {
            var filename = reqPath.replace(/^.*[\\\/]/, '')
            var directory = reqPath.substring(0, reqPath.lastIndexOf("/"));
            if (!settings.blockedPaths.includes(directory) && !settings.blockedFiles.includes(reqPath) && !settings.blockedFileNames.includes(filename) && !settings.blockedFileExtensions.includes(reqPath.split('.').pop())) {
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
                    log("<GET> 206 '" + reqPath + "' with byte range " + start + "-" + end + " (" + chunksize + " bytes)", false, "HTTP");
                    var file = fs.createReadStream(fullPath, {
                        start: start,
                        end: end
                    });
                    var contentType = mime.lookup(reqPath)
                    response.writeHead(206, {
                        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType
                    });
                    file.pipe(response);
                } else {
                    log("<GET> 200 '" + reqPath + "' sent." + " (" + total + " bytes)", false, "HTTP");
                    var contentType = mime.lookup(reqPath)
                    response.writeHead(200, {
                        'Content-Length': total,
                        'Content-Type': contentType
                    });
                    fs.createReadStream(fullPath).pipe(response);
                }
            } else {

                log("<GET> 404 '" + reqPath + "' ACCESS DENIED!", false, "HTTP");
                response.writeHead(404, {
                    'Content-Type': 'text/html'
                })
                response.end()
            }
        } else {
            log("<GET> 403 '" + reqPath + "' not found!", false, "HTTP");
            response.writeHead(403, {
                'Content-Type': 'text/html'
            })
            response.end()
        }
    } else {
        log("<UNKOWN METHOD> 501", false, "HTTP");
        response.writeHead(501, {
            'Content-Type': 'text/html'
        })
        response.end('Unknown method.')
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