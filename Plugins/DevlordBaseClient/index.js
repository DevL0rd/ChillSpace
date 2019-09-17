//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
function init(plugins, settings, events, io, log, commands) {
    commands.refresh = {
        usage: "refresh",
        help: "Tell all clients to refresh.",
        do: function () {
            log("Forcing clients to refresh.", false, "BaseUtils");
            io.emit("forceRefresh");
        }
    };
    events.on("connection", function (socket) {
        socket.on('ping', function () {
            socket.emit('pong');
        });
    });
}
function uninit(events, io, log, commands) {
    //Leave blank and let server know this can be reloaded
}
exports.init = init;
exports.uninit = uninit;