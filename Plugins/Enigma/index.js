//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var responses = [];
function init(plugins, settings, events, io, log, commands) {
    events.on("sendMessage", function (params) {
        var response = getBotResponse(params.msgObj.msg);
        if (response) {
            plugins.Chat.sendServerBroadcast(response);
        }
    });
}
function stringHas(text, stringArray) {
    for (i in stringArray) {
        var testString = stringArray[i];
        if (text.includes(testString)) {
            return true;
        }
    }
    return false;
}
function isQuestion(text) {
    return stringHas(text, ["?", "who", "what", "when", "where", "why", "how", "if", "can", "will"]);
}

function getBotResponse(message) {
    message = message.toLowerCase();
    var response = "";
    var messageContext = {
        isQuestion: isQuestion(message)
    }
    var needsNewLine = false;
    for (i in responses) {
        var reply = responses[i](message, messageContext);
        if (reply) {
            response += reply;
            if (needsNewLine) response += " \n"
            needsNewLine = true;
        }

    }
    return response;
}

responses.push(function (message, messageContext) {
    if (messageContext.isQuestion) {
        if (stringHas(message, ["what", "what is", "what's"])) {
            if (stringHas(message, ["the time", "time is it", "time is it?"])) {
                var d = new Date();
                return "The time is " + d.getTime() + ".";
            }
        }
    }
});
responses.push(function (message, messageContext) {
    if (messageContext.isQuestion) {
        if (stringHas(message, ["what", "what is", "what's"])) {
            if (stringHas(message, ["you", "your"] && stringHas(message, ["problem", "issue"]))) {
                var d = new Date();
                return "I don't know, i've been this way a long time.";
            }
        }
    }
});
exports.init = init;
exports.responses = responses;