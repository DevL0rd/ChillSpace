//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 3/17/2018
//Version: 1.0.0
function init(settings, events, io, log, commands) {
    events.on("post", function (request, response, body) {
        response.writeHead(200, {
            'Content-Type': 'text/html'
        });
        response.end('post received');
    })
}

module.exports.init = init