var systemMessageTimeout
var messageSound = new Audio('audio/message.mp3');
var systemMessageSound = new Audio('audio/messageSystem.mp3');
var typingSound = new Audio('audio/typing.mp3');
messageSound.volume = 1
systemMessageSound.volume = 1
typingSound.volume = 1
var lastMessageFrom = ""
var lastMessageElement
socket.on('newMessage', function (data) {
    if (data.username == "Server") {
        $("#systemMessageBox").fadeIn(400);
        $("#systemMessage").html(linkify(data.msg))
        clearTimeout(systemMessageTimeout)
        systemMessageTimeout = setTimeout(function () {
            $("#systemMessageBox").hide(400);
        }, 5000)
        systemMessageSound.play();
    } else {
        messageSound.play();
        if (lastMessageFrom == data.username) {
            $(lastMessageElement).find('.chatMessage').append("<br>" + linkify(data.msg));
        } else {
            var elem = $("#chatBox0").clone().appendTo("#chatLog");
            $(elem).find('.chatUsername').text(data.username);
            $(elem).find('.chatMessage').html(linkify(data.msg));
            $(elem).attr("class", "chatBox");
            $(elem).find('.chatBoxPhoto').attr('src', data.profilePicture);
            $(elem).show(400);
            lastMessageFrom = data.username
            lastMessageElement = elem
        }
        scrollToEndOfChat();
    }
})
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

function linkify(inputText) {
    inputText = inputText.replace(/(http\S+\.(jpg|gif|png|bmp|webp))/gim, '<img class="img-fluid" src="$1" />');
    inputText = inputText.replace(/(http\S+\.(mp4|flv|mkv|3gp))/gim, '<video controls class="img-fluid" src="$1" />');
    return inputText;
}

function scrollToEndOfChat() {
    var chatLog = document.getElementById("chatLog");
    chatLog.scrollTop = chatLog.scrollHeight;
}