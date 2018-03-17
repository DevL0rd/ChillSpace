var Version = 0
//Force debug until you make UI to toggle it
var debugenabled = true;
if (localStorage.debugenabled == null) {
    localStorage.debugenabled = JSON.stringify(debugenabled);
} else {
    debugenabled = JSON.parse(localStorage.debugenabled);
}
var isMobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    isMobile = true;
    var supportsOrientationChange = "onorientationchange" in window,
        orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";
}
Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
}
//IE support
if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }

        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}
//Socket Handling
//Init server connection
var socket = io();




socket.on('connect', function () {
    if (localStorage.persistentLoginKey != null && localStorage.persistentLoginKey != "") {
        socket.emit('autologin', {
            email: localStorage.email,
            persistentLoginKey: localStorage.persistentLoginKey
        })
    } else {
        $("#login").show();
    }
    socket.emit("getVideo");
});

socket.on('disconnect', function () {});

socket.on('forceRefresh', function () {
    window.location.reload()
});

socket.on('loginResponse', function (res) {
    if (res == "failed") {
        //could not log in
        $("#loginOutput").html("Invalid credentials.")
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Please Login")
            $("#loginOutput").css('color', 'white');
        }, 5000)
        localStorage.email = ""
        localStorage.username = ""
        localStorage.persistentLoginKey = ""
        $("#login").show();
    } else {
        localStorage.persistentLoginKey = res.persistentLoginKey;
        localStorage.username = res.username
        $("#accountName").html(res.username)
        $("#login").hide();
        socket.emit("updateUsers")
        $("#videoUrl").fadeIn();
        $("#profilePic").attr('src', res.profilePicture)


    }

});


socket.on('registerResponse', function (res) {
    if (res == "emailExists") {
        //email is already registered
        $("#loginOutput").html("This email is already in use.")
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if (res == "usernameExists") {
        //email is already registered
        $("#loginOutput").html("This username is already in use.")
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if (res == "registered") {
        //email was succesfully registered
        $("#loginOutput").html("Account created.")
        $("#loginOutput").css('color', 'green');
        setTimeout(function () {
            $("#loginOutput").html("Please Login")
            $("#loginOutput").css('color', 'white');
            $("#login_pswdcheck").hide()

            $("#login_username").hide();
            $("#login_button").text("Login")
            $("#registerLink").show()
            isRegistering = false;
        }, 5000)


    }
});

socket.on('unregistered', function (res) {
    //account was unregistered.

})
socket.on('connectionCount', function (connectionCount) {
    $("#watchingCount").html(connectionCount + " watching")
})
var onlineUsers = {}
socket.on('userLoggedOn', function (userData) {
    if (localStorage.email != userData.email && onlineUsers[userData.email] == null) {
        var elem = $("#userBar0").clone().appendTo("#onlineUsers");
        $(elem).find('.userBarName').text(userData.username);
        $(elem).attr("class", "userBar");
        onlineUsers[userData.email] = {
            elem: elem,
            userdata: userData
        };
        $(elem).find('.userBarPhotoHolder').attr('src', userData.profilePicture)
    }
})
socket.on('userLoggedOff', function (email) {
    if (onlineUsers[email] != null) {
        onlineUsers[email].elem.remove()
        delete onlineUsers[email];
    }
})
socket.on('forcelogout', function (res) {
    localStorage.persistentLoginKey = "";
    localStorage.email = "";
    localStorage.username = "";
    $("#pageCover").fadeIn(400);

    $("#accountName").html("Logged Out")
    $("#videoUrl").fadeOut();
})

socket.on('updateUser', function (userData) {
    if (localStorage.email != userData.email && onlineUsers[userData.email] == null) {
        var elem = $("#userBar0").clone().appendTo("#onlineUsers");
        $(elem).find('.userBarName').text(userData.username);
        $(elem).attr("class", "userBar");
        onlineUsers[userData.email] = {
            elem: elem,
            userdata: userData
        };
        $(elem).find('.userBarPhotoHolder').attr('src', userData.profilePicture)
    }
})
var cachedPlaylist = []
socket.on('updatePlaylist', function (playlist) {
    $("#playlist").html("")
    for (i in playlist) {
        var elem = $("#playListBar0").clone().appendTo("#playlist");
        $(elem).find('.playlistTitle').text(playlist[i].title);

        $(elem).find('.userBarPhotoHolder').attr('src', playlist[i].profilePicture)
        if (playlist[i].voters.includes(localStorage.username)) {

            $(elem).find(".voteBox").html("Votes   " + playlist[i].vote)


            $(elem).find(".voteBox").addClass("voteBoxRed")
        } else {
            $(elem).find(".voteBox").html("Votes   " + playlist[i].vote)

            $(elem).find(".voteBox").removeClass("voteBoxRed")
            $(elem).find(".voteBox").bind('click', {
                src: playlist[i].src,
                title: playlist[i].title
            }, function (event) {
                var data = event.data;
                vote(data.src)
            });
        }


        $(elem).show();
    }
})

function vote(src) {
    socket.emit("vote", src)
}

socket.on('getVideo', function (data) {
    $('#player').attr('src', data.src);
    socket.emit("syncVideo");
    isStopped = true;
    $("#togglePlay").html("▶")
    $('#videoTitleText').html(data.title)

})
var vid = document.getElementById("player");
vid.onloadeddata = function () {


    vid.play()
};
document.getElementById('player').addEventListener('ended', function () {
    socket.emit("videoEnded");
}, false);
document.getElementById('player').onerror = function () {
    socket.emit("videoFailed");
};

socket.on('getVideoTime', function () {
    socket.emit('getVideoTime', document.getElementById('player').currentTime);
})

socket.on('setVideoTime', function (timeSeconds) {
    try {
        document.getElementById('player').currentTime = timeSeconds;
    } catch (err) {

    }

})

socket.on('syncCheck', function (timeSeconds) {
    if (Math.abs(document.getElementById('player').currentTime - timeSeconds) >= 0.5) {

        try {
            document.getElementById('player').currentTime = timeSeconds;
        } catch (err) {

        }
    }
})

document.getElementById('player').addEventListener('loadedmetadata', function () {
    $('#videoTrack').attr('max', document.getElementById("player").duration);
});
var isUsingSlider = false;
document.getElementById("player").ontimeupdate = function () {
    if (!isUsingSlider) {
        $('#videoTrack').val(document.getElementById("player").currentTime);
    }
};

$("#videoTrack").change(function () {
    document.getElementById("player").currentTime = $(this).val()
    socket.emit('trackChanged', $(this).val())
})

document.getElementById("volumeSlider").onmousedown = function () {
    isUsingSlider = true

};
document.getElementById("volumeSlider").onmouseup = function () {
    isUsingSlider = false

};

$("#volumeSlider").change(function () {
    document.getElementById("player").volume = $(this).val() / 100
    localStorage.volume = document.getElementById("player").volume

    document.getElementById('player').muted = false;
})
$('#volume').click(function () {
    $('#volumeDropdown').toggle()

    document.getElementById('player').muted = false;
})

document.getElementById("player").volume = 0.5;
var systemMessageTimeout
var messageSound = new Audio('/audio/message.mp3');

var systemMessageSound = new Audio('/audio/messageSystem.mp3');
var typingSound = new Audio('/audio/typing.mp3');
messageSound.volume = 1
systemMessageSound.volume = 1
typingSound.volume = 1
var lastMessageFrom = ""
var lastMessageElement
socket.on('newMessage', function (data) {
    if (data.username == "Server") {
        $("#systemMessageBox").fadeIn(400)
        $("#systemMessage").html(linkify(data.msg))
        clearTimeout(systemMessageTimeout)
        systemMessageTimeout = setTimeout(function () {
            $("#systemMessageBox").fadeOut(400)
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
            $(elem).attr("class", "chatBoxLogged");
            $(elem).find('.chatBoxPhotoHolder').attr('src', data.profilePicture);
            lastMessageFrom = data.username
            lastMessageElement = elem
        }
        if (!chatIsVisible) {
            var floatElem = $(lastMessageElement).clone().appendTo("#chatArea");
            $(floatElem).find('.chatMessage').html(linkify(data.msg));

            $(floatElem).attr("class", "chatBox");
            $(floatElem).hide("drop", {
                direction: "up",
                distance: $(window).height() * 1.5,
                complete: function () {
                    this.remove();
                }
            }, 10000);
        } else {
            scrollToEndOfChat()
        }
    }

})

var isRegistering = false;

function register() {
    //verify registration info is valid
    if ($("#login_email").val().length < 6 || !$("#login_email").val().includes("@")) {
        $("#loginOutput").html("Invalid email address.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_username").val().length < 3) {
        $("#loginOutput").html("Username is less than 3 characters.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)

    } else if ($("#login_username").val().includes(" ") || $("#login_username").val().includes("   ")) {
        $("#loginOutput").html("Username cannot contain spaces.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_pswd").val() != $("#login_pswdcheck").val()) {
        $("#loginOutput").html("Passwords do not match.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_pswd").val().length < 5) {
        $("#loginOutput").html("Password is less than 5 characters.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Create an account.")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else {

        //send registration info
        socket.emit("register", {
            email: $("#login_email").val(),
            username: $("#login_username").val(),
            password: $("#login_pswd").val()
        });

    }
}

function logout() {
    localStorage.persistentLoginKey = "";
    localStorage.email = "";
    localStorage.username = "";
    socket.emit("logout");
    $("#accountDropdown").hide()
    $("#login").show()
    $("#accountName").html("Logged Out")
    $("#videoUrl").fadeOut();
}
$("#login_email").keyup(function (event) {
    if (event.keyCode === 13) {
        login();
    }
});
$("#login_pswd").keyup(function (event) {
    if (event.keyCode === 13) {
        login();
    }
});

function login() {
    if ($("#login_email").val().length < 6 || !$("#login_email").val().includes("@")) {
        $("#loginOutput").html("Invalid email address.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Please Login")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_pswd").val().length < 5) {
        $("#loginOutput").html("Password is less than 5 characters.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("Please Login")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else {
        localStorage.email = $("#login_email").val();
        socket.emit("login", {
            email: $("#login_email").val(),
            password: $("#login_pswd").val()
        });
    }

}

function loginButton() {
    if (isRegistering) {
        register();

    } else {
        login();
    }
}

function unregister() {
    localStorage.persistentLoginKey = "";
    localStorage.email = "";
    localStorage.username = "";
    socket.emit("unregister");
    socket.emit("logout");
}

function showRegister() {
    $("#login_pswdcheck").show();
    $("#login_username").show();
    $("#login_button").text("Register");
    $("#registerLink").hide();
    isRegistering = true;
    $("#loginOutput").html("Create an account.")
    $("#loginOutput").css('color', 'white');
}


$("#videoUrl").keyup(function (event) {
    if (event.keyCode === 13) {
        socket.emit("addVideo", $("#videoUrl").val());
        $("#videoUrl").val("");
    }
});
var chatBarTimeout
var isTypingTimeout
$("#chatBar").keyup(function (event) {
    if (event.keyCode === 13) {
        if ($("#chatBar").val().length != 0) {
            if ($("#chatBar").val() == "/bleed") {
                bleed();
            } else {
                socket.emit("sendMessage", $("#chatBar").val());
            }
        }
        $("#chatBar").val("")
    }
    showChat()
    if (localStorage.email != "") {
        socket.emit("isTyping")
    }
});

$("#accountBar").click(function () {
    if (localStorage.email != "") {
        $("#onlineUsers").hide()
        $("#accountDropdown").toggle()
    }
})
$("#watchingCount").click(function () {
    if (localStorage.email != "") {
        $("#onlineUsers").toggle()
        $("#accountDropdown").hide()
    }
})
var isStopped = false;
socket.on('playVideo', function () {
    document.getElementById('player').play();

})

socket.on('pauseVideo', function () {
    document.getElementById('player').pause();
})
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


function togglePlay() {
    if (localStorage.email != "") {
        if (isStopped) {
            socket.emit('playVideo');
        } else {
            socket.emit('pauseVideo');
        }
        $("#accountDropdown").hide()
    }
}

document.getElementById('player').onwaiting = function () {
    $("#videoLoadingCover").fadeIn(500)
    $("#lodaingGif").fadeIn(500)
};
var antiSyncStutterTimeout
var alreadySynced = false
document.getElementById('player').onplaying = function () {
    isStopped = false;
    $("#togglePlay").html("▌▌")
    if (!alreadySynced) {
        socket.emit("syncVideo")
        alreadySynced = true
        clearTimeout(antiSyncStutterTimeout)
        antiSyncStutterTimeout = setTimeout(function () {
            alreadySynced = false
        }, 2000)
    }

    $("#videoLoadingCover").fadeOut(300)
    $("#lodaingGif").fadeOut(300)
    if (!isMobile) {
        document.getElementById('player').muted = false;
    }
};
if (localStorage.volume != null) {

    document.getElementById("player").volume = localStorage.volume
    $("#volumeSlider").val(localStorage.volume * 100);

}
document.getElementById('player').onpause = function () {
    isStopped = true;
    $("#togglePlay").html("▶")
    socket.emit("syncVideo");
};

var chatIsVisible = false;
$(document).mousemove(function (event) {
    showChat()
});

function showChat() {
    $("#chatBar").fadeIn(300);
    $("#chatLog").fadeIn(300);
    $("#playerArea").fadeIn(300);
    $("#controls").fadeIn(300);
    $("#alwaysShowChat").fadeIn(300);
    $("#controlsBG").fadeIn(300);
    $("#videoTitleBG").fadeIn(300);
    $("#videoTitle").fadeIn(300);
    $("#specialEffects").fadeIn(300);

    if (!chatIsVisible) {
        scrollToEndOfChat()
        chatIsVisible = true;
        resizeVideoPlayer()

    }
    if (!$("#alwaysShowChat").prop("checked")) {
        clearTimeout(chatBarTimeout);
        chatBarTimeout = setTimeout(function () {
            $("#chatBar").fadeOut(300);
            $("#chatLog").fadeOut(300);
            $("#controls").fadeOut(300);
            $("#videoTitle").fadeOut(300);
            $("#alwaysShowChat").fadeOut(300);
            $("#controlsBG").fadeOut(300);
            $("#videoTitleBG").fadeOut(300);
            $("#playerArea").fadeOut(300);
            $("#specialEffects").fadeOut(300);
            chatIsVisible = false;
            resizeVideoPlayer()
        }, 8000)

    } else {
        clearTimeout(chatBarTimeout);
        chatBarTimeout = setTimeout(function () {

            $("#controls").fadeOut(300);
            $("#controlsBG").fadeOut(300);
            $("#videoTitle").fadeOut(300);
            $("#videoTitleBG").fadeOut(300);
            $("#playerArea").fadeOut(300);
            $("#specialEffects").fadeOut(300);

        }, 8000)

    }
}

$("#alwaysShowChat").change(function () {
    clearTimeout(chatBarTimeout);
    resizeVideoPlayer()
})
var resizeTimeout
window.onresize = function () {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(function () {
        resizeVideoPlayer()
    }, 200)
};
if (isMobile) {
    window.addEventListener(orientationEvent, function () {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(function () {
            resizeVideoPlayer()
        }, 200)
    }, false);
    body.requestFullscreen();
}

function scrollToEndOfChat() {
    var chatLog = document.getElementById("chatLog");
    chatLog.scrollTop = chatLog.scrollHeight;
}

function resizeVideoPlayer() {
    if (chatIsVisible && !isMobile && $(window).width() >= 1000) {
        if ($("#alwaysShowChat").prop("checked")) {
            $("#player").animate({
                width: $(window).width() - $(chatLog).innerWidth()
            }, 300, function () {
                // Animation complete.
            });
        } else {
            $("#player").animate({
                width: $(window).width()
            }, 300, function () {
                // Animation complete.
            });
        }

        $("#playerArea").animate({
            width: $(window).width() - $(chatLog).innerWidth()
        }, 300, function () {
            // Animation complete.
        });

    } else {

        $("#player").animate({
            width: $(window).width()
        }, 300, function () {
            // Animation complete.
        });
        $("#playerArea").animate({
            width: $(window).width()
        }, 300, function () {
            // Animation complete.
        });

    }

}

function linkify(inputText) {
    inputText = inputText.replace(/(http\S+\.(jpg|gif|png|bmp|webp))/gim, '<img class="messageImage" src="$1" />');
    inputText = inputText.replace(/(http\S+\.(mp4|flv|mkv|3gp))/gim, '<video controls class="messageImage" src="$1" />');
    return inputText;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function bleed() {
    var elemBody = document.body;
    var canvas = document.createElement('canvas');
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.pointerEvents = "none";
    elemBody.appendChild(canvas);
    var context = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    elemBody.onresize = function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight
    };
    var snowFlakes = [];

    var renderFrame = function () {
        context.fillStyle = "#FF0000";
        for (var i in snowFlakes) {
            if (snowFlakes[i].y < window.innerHeight) {
                context.beginPath();
                snowFlakes[i].y += 1 / snowFlakes[i].radius;
                context.arc(snowFlakes[i].x, snowFlakes[i].y, snowFlakes[i].radius, 0, 2 * Math.PI);
                context.fill()
            } else {
                snowFlakes.splice(i, 1)
            }
        }
        requestAnimationFrame(renderFrame)
    }



    var spawnSnowflake = function () {
        var randomSpawnX = getRandomInt(0, window.innerWidth);
        var randomRadius = getRandomInt(3, 10);
        snowFlakes.push({
            x: randomSpawnX,
            y: -5,
            radius: randomRadius
        })
    }
    setInterval(spawnSnowflake, 500);
    renderFrame();
}
