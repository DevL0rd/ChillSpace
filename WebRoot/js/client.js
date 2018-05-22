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


var socket = io();

socket.on('forceRefresh', function () {
    window.location.reload()
});

socket.on('connect', function () {
    socket.emit("getVideo");
    if (localStorage.persistentLoginKey != null && localStorage.persistentLoginKey != "") {
        socket.emit('autologin', {
            email: localStorage.email,
            persistentLoginKey: localStorage.persistentLoginKey
        })
    }
});

socket.on('disconnect', function () {

});

var player = document.getElementById('player');
var isStopped = false;
socket.on('playVideo', function () {
    try {

        player.play();
    } catch (err) {

        socket.emit("videoFailed");
    }

})
socket.on('pauseVideo', function () {
    player.pause();
})

function togglePlay() {
    if (localStorage.email != "") {
        if (isStopped) {
            socket.emit('playVideo');
        } else {
            socket.emit('pauseVideo');
        }
    }
}

player.onwaiting = function () {
    $("#videoLoadingCover").fadeOut(400);
};

var antiSyncStutterTimeout;
var alreadySynced = false;
player.onplaying = function () {
    isStopped = false;
    $("#togglePlay").html("<i class='fa fa-pause' aria-hidden='true'></i>");
    if (!alreadySynced) {
        socket.emit("syncVideo");
        alreadySynced = true;
        clearTimeout(antiSyncStutterTimeout);
        antiSyncStutterTimeout = setTimeout(function () {
            alreadySynced = false;
        }, 2000);
    }
    $("#videoLoadingCover").fadeOut(300);
};

socket.on('syncCheck', function (timeSeconds) {
    if (!isUsingSlider) {
        if (Math.abs(player.currentTime - timeSeconds) >= 0.5) {

            try {
                player.currentTime = timeSeconds;
            } catch (err) {

            }
        }
    }
})

player.addEventListener('loadedmetadata', function () {
    $('#videoTrack').attr('max', player.duration);
});
var isUsingSlider = false;
player.ontimeupdate = function () {
    if (!isUsingSlider) {
        $('#videoTrack').val(player.currentTime);
    }
};

var usingSliderTimeout
$("#videoTrack").change(function () {
    player.currentTime = $(this).val();
    isUsingSlider = true;
    socket.emit('trackChanged', $(this).val());
    clearTimeout(usingSliderTimeout)
    usingSliderTimeout = setTimeout(function () {
        isUsingSlider = false;
    }, 200)
})


$("#volumeSlider").change(function () {
    player.volume = $(this).val() / 100;
    localStorage.volume = player.volume;
    player.muted = false;
})
$('#volume').click(function () {
    $('#volumeDropdown').toggle();
    player.muted = false;
});
player.volume = 0.5;

player.onloadeddata = function () {
    player.play();
};

player.addEventListener('ended', function () {
    socket.emit("videoEnded");
}, false);

player.onerror = function () {
    socket.emit("videoFailed");
};

socket.on('getVideoTime', function () {
    socket.emit('getVideoTime', player.currentTime);
})

socket.on('setVideoTime', function (timeSeconds) {
    try {
        if (!isUsingSlider) {
            player.currentTime = timeSeconds;
        }
    } catch (err) {

    }

})

socket.on('getVideo', function (data) {
    $('#player').attr('src', data.src);
    socket.emit("syncVideo");
    isStopped = true;
    $("#togglePlay").html("<i class='fa fa-play' aria-hidden='true'></i>")
    $('#videoTitleText').html(data.title)

})
if (localStorage.volume != null) {
    player.volume = localStorage.volume
    $("#volumeSlider").val(localStorage.volume * 100);
}
document.getElementById('player').onpause = function () {
    isStopped = true;
    $("#togglePlay").html("<i class='fa fa-play' aria-hidden='true'></i>")
    socket.emit("syncVideo");
};
$("#videoUrl").keyup(function (event) {
    if (event.keyCode === 13) {
        socket.emit("addVideo", $("#videoUrl").val());
        $("#videoUrl").val("");
    }
    showControls();
});

var cachedPlaylist = []
socket.on('updatePlaylist', function (playlist) {
    $("#playlist").html("")
    for (i in playlist) {
        var elem = $("#playListBar0").clone().appendTo("#playlist");
        $(elem).find('.playlistTitle').text(playlist[i].title);

        $(elem).find('.videoUserPhoto').attr('src', playlist[i].profilePicture)
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


        $(elem).fadeIn(400);
    }
})

function vote(src) {
    socket.emit("vote", src)
}
var hideControlsTimeout

function showControls() {
    clearTimeout(hideControlsTimeout);
    $("#videoOverlay").fadeIn(400);
    hideControlsTimeout = setTimeout(function () {
        $("#videoOverlay").fadeOut(400);
    }, 6000)
}

$('#toggleFullscreen').on('click', function () {
    // if already full screen; exit
    // else go fullscreen
    if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    ) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    } else {
        element = $('#playerContainer').get(0);
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }
});
//https://www.quirksmode.org/html5/videos/big_buck_bunny.mp4
