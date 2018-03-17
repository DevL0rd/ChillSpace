//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/17/2018
//Version: 1.0.0
var fs = require('fs');
var youTubeParser = require('youtube-parser');
var DB = require('../Devlord_modules/DB.js');
//Load DBS
var videoSyncBuffer = []
var currentVideoSource
var videoIsStopped = false;
var syncEveryone = false;
var host
if (fs.existsSync("./Plugins/MediaShare/currentPlaylist.json")) {
    var playlist = DB.load("./Plugins/MediaShare/currentPlaylist.json")
} else {
    var playlist = []
    DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
}

function init(settings, events, io, log, commands) {
    events.on("disconnect", function (socket) {
        socket.host = false;
        var sockets = io.sockets.sockets;
        for (var socketId in sockets) {
            var socketIt = sockets[socketId];
            if (socket != socketIt) {
                socketIt.host = true;

                host = socketIt
                break;
            }
        }
    })
    events.on("connection", function (socket) {

        if (io.clientcount == 1) {
            socket.host = true;
            host = socket
        } else {
            socket.host = false;
        }

        socket.on('addVideo', function (url) {
            if (socket.isLoggedIn) {
                var extension = url.substr(1).split('.').pop()
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    getYoutubeMp4Url(url, function (title, src) {
                        playlist.push({
                            src: src,
                            title: title,
                            vote: 0,
                            voters: [],
                            profilePicture: socket.profilePicture
                        });
                        if (currentVideoSource == null && playlist.length > 0) {
                            currentVideoSource = playlist.shift()
                            io.emit('getVideo', currentVideoSource)
                        }
                        io.emit("newMessage", {
                            username: "Server",
                            msg: socket.username + " added '" + title + "'to the queue.",
                            profilePicture: socket.profilePicture
                        })

                        io.emit("updatePlaylist", playlist)

                        DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
                    })
                } else if (url.includes('googlevideo.com')) {
                    playlist.push({
                        src: url,
                        title: "Unknown Youtube Video",
                        vote: 0,
                        voters: [],
                        profilePicture: socket.profilePicture
                    });
                    if (currentVideoSource == null && playlist.length > 0) {
                        currentVideoSource = playlist.shift()
                        io.emit('getVideo', currentVideoSource)
                    }
                    io.emit("newMessage", {
                        username: "Server",
                        msg: socket.username + " added a youtube video to the queue.",
                        profilePicture: socket.profilePicture
                    })
                    io.emit("updatePlaylist", playlist)

                    DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
                } else if (extension == "mp4") {

                    playlist.push({
                        src: url,
                        title: "Unknown MP4 Video",
                        vote: 0,
                        voters: [],
                        profilePicture: socket.profilePicture
                    });
                    if (currentVideoSource == null && playlist.length > 0) {
                        currentVideoSource = playlist.shift()
                        io.emit('getVideo', currentVideoSource)
                    }
                    io.emit("newMessage", {
                        username: "Server",
                        msg: socket.username + " added a video to the queue.",
                        profilePicture: socket.profilePicture
                    })
                    io.emit("updatePlaylist", playlist)

                    DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)

                } else {
                    playlist.push({
                        src: url,
                        title: "Unknown Source",
                        vote: 0,
                        voters: [],
                        profilePicture: socket.profilePicture
                    });
                    if (currentVideoSource == null && playlist.length > 0) {
                        currentVideoSource = playlist.shift()
                        io.emit('getVideo', currentVideoSource)
                    }
                    io.emit("newMessage", {
                        username: "Server",
                        msg: socket.username + " added a unknown source to the queue."
                    })
                    io.emit("updatePlaylist", playlist)

                    DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
                }
            }
        })
        socket.on("videoEnded", function () {
            if (socket.host) {
                currentVideoSource = null;
                if (playlist.length > 0) {
                    currentVideoSource = playlist.shift()
                    io.emit('getVideo', currentVideoSource)

                }
                io.emit("updatePlaylist", playlist)

                DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
            }
        })
        socket.on("videoFailed", function () {

            if (socket.host) {
                io.emit("newMessage", {
                    username: "Server",
                    msg: "Video could not be played, source inaccessible."
                })
                currentVideoSource = null
                if (playlist.length > 0) {
                    currentVideoSource = playlist.shift()
                    io.emit('getVideo', currentVideoSource)

                }
                io.emit("updatePlaylist", playlist)

                DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
            }
        })
        socket.on('vote', function (url) {
            if (socket.isLoggedIn) {
                for (i in playlist) {
                    if (playlist[i].src == url) {
                        if (!playlist[i].voters.includes(socket.username)) {
                            playlist[i].voters.push(socket.username)
                            playlist[i].vote++;

                            playlist.sort(dynamicSort("vote")).reverse();
                            io.emit("updatePlaylist", playlist)

                            DB.save("./Plugins/MediaShare/currentPlaylist.json", playlist)
                        }
                        break;
                    }
                }

            }


        })

        function dynamicSort(property) {
            var sortOrder = 1;
            if (property[0] === "-") {
                sortOrder = -1;
                property = property.substr(1);
            }
            return function (a, b) {
                var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
                return result * sortOrder;
            }
        }
        socket.on('getVideo', function () {
            if (currentVideoSource == null && playlist.length > 0) {
                currentVideoSource = playlist.shift()
                io.emit('getVideo', currentVideoSource)
                if (videoIsStopped) {
                    io.emit('pauseVideo')
                }
            }
            if (currentVideoSource != null) {

                socket.emit('getVideo', currentVideoSource)
            }
            if (videoIsStopped) {
                socket.emit('pauseVideo')
            }

            io.emit("updatePlaylist", playlist)
        })
        socket.on("getVideoTime", function (timeSeconds) {
            if (socket.host) {
                if (syncEveryone) {
                    var sockets = io.sockets.sockets;
                    for (var socketId in sockets) {
                        var socketIt = sockets[socketId];
                        if (!socketIt.host) {
                            socketIt.emit('syncCheck', timeSeconds)
                        }
                    }
                    syncEveryone = false;
                } else {
                    for (i in videoSyncBuffer) {
                        videoSyncBuffer[i].emit('setVideoTime', timeSeconds)
                        if (videoIsStopped) {
                            videoSyncBuffer[i].emit('pauseVideo')
                        }
                    }
                }

                videoSyncBuffer = []
            }
        })
        socket.on('trackChanged', function (timeSeconds) {
            if (socket.isLoggedIn) {
                io.emit('setVideoTime', timeSeconds)
            }
        })
        socket.on('syncVideo', function () {
            if (!socket.host) {
                videoSyncBuffer.push(socket)
                host.emit("getVideoTime")
            }
        })
        socket.on('playVideo', function () {
            if (socket.isLoggedIn) {
                log(socket.email + " played the video.")
                io.emit("playVideo")
                videoIsStopped = false;
                io.emit("newMessage", {
                    username: "Server",
                    msg: socket.username + " un-paused the video.",
                    profilePicture: socket.profilePicture
                })
            }
        })
        socket.on('pauseVideo', function () {
            if (socket.isLoggedIn) {
                log(socket.email + " paused the video.")
                io.emit("pauseVideo")
                videoIsStopped = true;
                io.emit("newMessage", {
                    username: "Server",
                    msg: socket.username + " paused the video.",
                    profilePicture: socket.profilePicture
                })
            }
        })
    })
}

setInterval(function () {
    if (host != null) {
        host.emit("getVideoTime")
        syncEveryone = true;
    }

}, 1000)

function getYoutubeMp4Url(url, onGetUrl) {
    youTubeParser.getURL(url, {
            quality: 'high',
            container: 'webm'
        })
        .then(
            function (urlList) {
                // Access URLs. 
                youTubeParser.getMetadata(url)
                    .then(
                        function (metadata) {
                            onGetUrl(metadata.title, urlList[0].url);
                        }
                    );
            }
        );
}
module.exports.init = init;