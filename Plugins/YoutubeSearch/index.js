//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var YouTube = require('youtube-node');
var fs = require('fs');
var DB = require('../../Devlord_modules/DB.js');
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
                youTube.search(searchStr, 15, function (error, result) {
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
function uninit(events, io, log, commands) {
    //Leave blank uninit so server thinks it can be unloaded
}
module.exports.init = init;
exports.uninit = uninit;