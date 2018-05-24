//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var fs = require('fs');
var DB = require('../Devlord_modules/DB.js');
var YouTube = require('youtube-node');
var youTube = new YouTube();
if (fs.existsSync(__dirname + "/YoutubeSearch/settings.json")) {
    var settings = DB.load(__dirname + "/YoutubeSearch/settings.json")
} else {
    settings = {
        youtubeApiKey: "AIzaSyB_LEvbvxljoTEihjC-9dWelHHli4IoVns"
    }
    DB.save(__dirname + "/YoutubeSearch/settings.json", settings)
}
youTube.setKey(settings.youtubeApiKey);
function init(plugins, settings, events, io, log, commands) {
    events.on("connection", function (socket) {
        socket.on("searchYoutube", function (searchStr) {
            youTube.search(searchStr, 25, function (error, result) {
                if (error) {
                    socket.emit("searchYoutube", []);
                } else {
                    socket.emit("searchYoutube", result.items);
                }
            });
        });
    })
}
module.exports.init = init;