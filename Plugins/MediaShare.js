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
var playlistDir = __dirname + "/MediaShare/currentPlaylist.json";
if (fs.existsSync(playlistDir)) {
    var playlist = DB.load(playlistDir)
} else {
    var playlist = []
    DB.save(playlistDir, playlist)
}
function findWithAttrCount(array, attr, value) {
    var attrMatchCount = 0;
    for (i in array) {
        if (array[i][attr] === value) {
            attrMatchCount++;
        }
    }
    return attrMatchCount;
}

function init(plugins, settings, events, io, log, commands) {
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
    });
    events.on("connection", function (socket) {
        if (io.clientcount == 1) {
            socket.host = true;
            host = socket
        } else {
            socket.host = false;
        }
        socket.on('addVideo', function (url) {
            if (socket.isLoggedIn && url) {
                if (plugins.Accounts.hasPermission(socket.email, "unlimitedVideos") || findWithAttrCount(playlist, "username", socket.username) < 3) {
                    var extension = url.substr(1).split('.').pop()
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        getYoutubeMp4Url(url, function (title, src) {
                            playlist.push({
                                src: src,
                                title: title,
                                vote: 0,
                                voters: [],
                                profilePicture: socket.profilePicture,
                                username: socket.username
                            });
                            if (currentVideoSource == null && playlist.length > 0) {
                                currentVideoSource = playlist.shift()
                                videoIsStopped = false;
                                io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
                            }
                            log(socket.username + " added '" + title + "'to the queue.");
                            io.emit("updatePlaylist", playlist)

                            DB.save(playlistDir, playlist)

                        })
                    } else if (url.includes('googlevideo.com')) {

                        playlist.push({
                            src: url,
                            title: "Unknown Youtube Video",
                            vote: 0,
                            voters: [],
                            profilePicture: socket.profilePicture,
                            username: socket.username
                        });
                        if (currentVideoSource == null && playlist.length > 0) {
                            currentVideoSource = playlist.shift()
                            videoIsStopped = false;
                            io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
                        }
                        log(socket.username + " added a youtube video to the queue.");
                        io.emit("updatePlaylist", playlist)

                        DB.save(playlistDir, playlist)
                    } else if (extension == "mp4") {

                        playlist.push({
                            src: url,
                            title: "Unknown MP4 Video",
                            vote: 0,
                            voters: [],
                            profilePicture: socket.profilePicture,
                            username: socket.username
                        });
                        if (currentVideoSource == null && playlist.length > 0) {
                            currentVideoSource = playlist.shift()
                            videoIsStopped = false;
                            io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
                        }
                        log(socket.username + " added a video to the queue.");
                        io.emit("updatePlaylist", playlist)

                        DB.save(playlistDir, playlist)

                    } else {
                        playlist.push({
                            src: url,
                            title: "Unknown Source",
                            vote: 0,
                            voters: [],
                            profilePicture: socket.profilePicture,
                            username: socket.username
                        });
                        if (currentVideoSource == null && playlist.length > 0) {
                            currentVideoSource = playlist.shift()
                            videoIsStopped = false;
                            io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
                        }
                        log(socket.username + " added a unknown source to the queue.");
                        io.emit("updatePlaylist", playlist)

                        DB.save(playlistDir, playlist)
                    }
                } else {
                    plugins["Chat"].sendServerPm(socket, "You have already added 3 videos. Please wait to add more.", 6000);
                }
            }
        })
        socket.on("videoEnded", function () {
            if (socket.host) {
                currentVideoSource = null;
                if (playlist.length > 0) {
                    currentVideoSource = playlist.shift()
                    videoIsStopped = false;
                    io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
                }
                io.emit("updatePlaylist", playlist)
                DB.save(playlistDir, playlist)
            }
        })
        socket.on("videoFailed", function () {

            if (socket.host) {
                plugins["Chat"].sendServerBroadcast("Video could not be played, source inaccessible.", 6000);
                currentVideoSource = null
                if (playlist.length > 0) {
                    currentVideoSource = playlist.shift()
                    videoIsStopped = false;
                    io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
                }
                io.emit("updatePlaylist", playlist)

                DB.save(playlistDir, playlist)
            }
        })
        socket.on('vote', function (url) {
            if (socket.isLoggedIn && url) {
                for (i in playlist) {
                    if (playlist[i].src == url) {
                        if (!playlist[i].voters.includes(socket.username)) {
                            playlist[i].voters.push(socket.username)
                            playlist[i].vote++;
                            playlist.sort(dynamicSort("vote")).reverse();
                            io.emit("updatePlaylist", playlist)
                            DB.save(playlistDir, playlist)
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
                videoIsStopped = false;
                io.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
            }
            if (currentVideoSource != null) {

                socket.emit('getVideo', { videoData: currentVideoSource, isPaused: videoIsStopped })
            }

            io.emit("updatePlaylist", playlist)
        })
        socket.on("getVideoTime", function (timeSeconds) {
            if (socket.host && timeSeconds && !isNaN(timeSeconds)) {
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
            if (timeSeconds && !isNaN(timeSeconds)) {


                if (socket.isLoggedIn && plugins.Accounts.hasPermission(socket.email, "controlVideo")) {
                    io.emit('setVideoTime', timeSeconds)
                }
            }
        })
        socket.on('syncVideo', function () {
            if (!socket.host) {
                videoSyncBuffer.push(socket)
                host.emit("getVideoTime")
            }
        })
        socket.on('playVideo', function () {

            if (socket.isLoggedIn && plugins.Accounts.hasPermission(socket.email, "controlVideo")) {
                log(socket.email + " un-paused the video.")
                io.emit("playVideo")
                videoIsStopped = false;
                plugins["Chat"].sendServerBroadcast(socket.username + " un-paused the video.", 6000);
            }
        })
        socket.on('pauseVideo', function () {
            if (socket.isLoggedIn && plugins.Accounts.hasPermission(socket.email, "controlVideo")) {
                log(socket.email + " paused the video.")
                io.emit("pauseVideo")
                videoIsStopped = true;
                plugins["Chat"].sendServerBroadcast(socket.username + " paused the video.", 6000);
            }
        });
    });
}
setInterval(function () {
    if (host != null && currentVideoSource) {
        host.emit("getVideoTime")
        syncEveryone = true;
    }
}, 1000)
function getYoutubeMp4Url(url, onGetUrl) {
    youTubeParser.getURL(url, {
        quality: 'high',
        container: 'mp4'
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