//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var fs = require('fs');
var DB = require('../../Devlord_modules/DB.js');
var YouTube = require('youtube-node');
var youTube = new YouTube();
if (fs.existsSync(__dirname + "/settings.json")) {
    var settings = DB.load(__dirname + "/settings.json")
} else {
    settings = {
        youtubeApiKey: ""
    }
    DB.save(__dirname + "/settings.json", settings)
}
youTube.setKey(settings.youtubeApiKey);
function init(plugins, settings, events, io, log, commands) {
    events.on("connection", function (socket) {
        socket.on("searchYoutube", function (searchStr) {
            if (searchStr) {
                youTube.search(searchStr, 25, function (error, result) {
                    if (error) {
                        socket.emit("searchYoutube", []);
                    } else {
                        socket.emit("searchYoutube", result.items);
                    }
                });
            }
        });
    })
}
module.exports.init = init;