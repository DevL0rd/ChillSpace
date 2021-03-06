//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var systemMessageTimeout
var messageSound = new Audio('audio/message.mp3');
var typingSound = new Audio('audio/typing.mp3');
messageSound.volume = 1
typingSound.volume = 1
var lastMessageFrom = ""
var lastMessageElement
socket.on('newMessage', function (msgData) {
    messageSound.play();
    showMessage(msgData);
    if ($("#chatFloatArea").is(":visible")) {
        floatMessage(msgData);
        console.log("Test")
    }
    refreshAnimatedElements();
    scrollToEndOfChat();
});

function formatMessage(msg) {
    msg = linkify(msg);
    msg = formatMentions(msg);
    return msg;
}

function formatMentions(msg) {
    var mentions = getMentionsList(msg);
    if (mentions) {
        for (i in mentions) {
            var mention = mentions[i];
            var htmlMentionButton = "<span class='mentionPill'>" + mention + "</span>";
            msg = msg.replace(mention, htmlMentionButton);
        }
    }
    return msg;
}
//Find any username starting with an @symbol
function getMentionsList(str) {
    var pattern = /\B@[a-z0-9_-]+/gi;
    return str.match(pattern);
}

function clearMessagesFromUser(uname) {
    var messages = $(".chatBox").toArray();
    for (i in messages) {
        var message = messages[i];
        console.log($(message).find('.chatUsername').text());
        if ($(message).find('.chatUsername').text() == uname) {
            message.parentNode.removeChild(message);
        }
    }
    console.log(messages);
}

function showMessage(data) {

    data.msg = formatMessage(data.msg);
    if (data.username != "Server" && lastMessageFrom == data.username) {
        $(lastMessageElement).find('.chatMessage').append("<br>" + data.msg);
    } else {
        var elem = $("#chatBox0").clone().appendTo("#chatLog");
        $(elem).find('.chatUsername').text(data.username);
        $(elem).find('.chatMessage').html(data.msg);
        $(elem).attr("id", "");
        if (data.username == localStorage.username) {
            //this is the current user, remove all unused buttons.
            $(elem).find('.muteUserButton').remove();
            $(elem).find('.clearMessagesButton').remove();
        } else {
            //this is some other user
            $(elem).find('.muteUserButton').click(function () {
                socket.emit("sendMessage", "!mute " + data.username);
                clearMessagesFromUser(data.username);
            });
            $(elem).find('.clearMessagesButton').click(function () {
                clearMessagesFromUser(data.username);
            });
        }
        if (data.username == "Server") {
            $(elem).attr("class", "chatBox bounceLeft serverMessage");
            if (data.timeout) {
                setTimeout(function () {
                    $(elem).hide(400);
                }, data.timeout)
            }
        } else {
            $(elem).attr("class", "chatBox bounceLeft");
        }
        $(elem).find('.chatBoxPhoto').attr('src', data.profilePicture);
        var badgeGenHtml = "";
        for (i in data.badges) {
            var badge = data.badges[i];
            var badgeUrl = "img/badges/" + badge + ".png"
            badgeGenHtml += "<img src='" + badgeUrl + "'>"
        }
        $(elem).find('.badges').html(badgeGenHtml);
        $(elem).show(400);
        lastMessageFrom = data.username
        lastMessageElement = elem
    }
}

var floatElems = [];

function floatMessage(data) {
    var floatElem = $("#chatBox0").clone().appendTo("#chatFloatArea");
    $(floatElem).find('.chatUsername').text(data.username);
    $(floatElem).find('.chatMessage').html(data.msg);
    $(floatElem).attr("id", "");
    if (data.username == "Server") {
        $(floatElem).attr("class", "chatBox serverMessage");
    } else {
        $(floatElem).attr("class", "chatBox");
    }
    $(floatElem).find('.chatBoxPhoto').attr('src', data.profilePicture);
    var badgeGenHtml = "";
    for (i in data.badges) {
        var badge = data.badges[i];
        var badgeUrl = "img/badges/" + badge + ".png"
        badgeGenHtml += "<img src='" + badgeUrl + "'>"
    }
    $(floatElem).find('.badges').html(badgeGenHtml);
    $(floatElem).show(400);
    var fElemTimeout = setTimeout(function () {
        $(floatElem).slideUp(1000, function () {
            this.remove();
        });
    }, 4000);
    floatElems.push({
        elem: floatElem,
        timeout: fElemTimeout
    });
    if (floatElems.length > 2) {
        var remElem = floatElems.shift();
        clearTimeout(remElem.timeout);
        $(remElem.elem).slideUp(500, function () {
            this.remove();
        });
    }
}

var isTypingTimeout
$("#chatBar").keyup(function (event) {
    if (event.keyCode === 13) {
        if ($("#chatBar").val().length != 0) {
            socket.emit("sendMessage", $("#chatBar").val());
        }
        $("#chatBar").val("")
    }
    if (localStorage.email != "") {
        socket.emit("isTyping")
    }
});

var playedTypingSound = false;
socket.on('isTyping', function (user) {
    if (user.email != localStorage.email) {
        $("#typingNotice").fadeIn()
        $('#typingNoticeText').html(user.username + " is typing...")
        if (!playedTypingSound) {
            typingSound.play()
            playedTypingSound = true;
        }
        clearTimeout(isTypingTimeout)
        isTypingTimeout = setTimeout(function () {

            $("#typingNotice").fadeOut()

            playedTypingSound = false;
        }, 1000)
    }
})
socket.on("getChatLog", function (cLog) {
    for (i in cLog) {
        showMessage(cLog[i]);
    }
    refreshAnimatedElements();
    scrollToEndOfChat();
});

function linkify(inputText) {
    inputText = inputText.replace(/(http\S+\.(jpg|gif|png|bmp|webp))/gim, '<img class="img-fluid" src="$1" />');
    inputText = inputText.replace(/(http\S+\.(mp4|flv|mkv|3gp))/gim, '<video controls class="img-fluid" src="$1" />');
    return inputText;
}
var isStillScrolling = false;

function scrollToEndOfChat() {
    if (!isStillScrolling) {
        isStillScrolling = true;
        $("#chatLog").animate({
            scrollTop: $('#chatLog')[0].scrollHeight
        }, 1000, "swing", function () {
            isStillScrolling = false;
        });
    }
}