//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/21/2018
//Version: 1.0.0
function init(plugins, settings, events, io, log, commands) {
    events.on("post", function (request, response, urlParts, body) {
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        var reponseData = {
            data: "post received"
        }
        response.end(JSON.stringify(reponseData));
        //Tell server the request was handled by this plugin
        return true;
    })
    events.on("get", function (request, response, urlParts, ispath) {

    })
}

module.exports.init = init