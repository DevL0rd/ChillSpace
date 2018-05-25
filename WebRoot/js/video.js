var player = document.getElementById('player');
var isStopped = false;
var noMediaVideoSrc = "https://www.videvo.net/videvo_files/converted/2016_01/preview/Blue_Particle_Motion_Background_1080.mov81869.webm";
$('#player').attr('src', noMediaVideoSrc);
player.loop = true;
socket.on('playVideo', function () {
    try {
        player.play();
        if (!isMobile) {
            player.muted = false;
        }
    } catch (err) {
        socket.emit("videoFailed");
    }
    isStopped = false;
})
socket.on('pauseVideo', function () {
    player.pause();
    isStopped = true;
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
    $("#videoLoadingCover").fadeIn(400);
};

var antiSyncStutterTimeout;
var alreadySynced = false;
player.onplaying = function () {
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
                if (isStopped) {
                    player.pause();
                } else {
                    player.play();
                }
                if (!isMobile) {
                    player.muted = false;
                }
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

player.onloadeddata = loadedVideoData;
function loadedVideoData() {
    try {
        if (isStopped) {
            player.pause();
        } else {
            player.play();
        }
        if (!isMobile) {
            player.muted = false;
        }
        socket.emit("syncVideo");
    } catch (err) {
        socket.emit("videoFailed");
    }
};
var vidEndedTimeout
player.addEventListener('ended', function () {
    player.loop = true;
    clearTimeout(vidEndedTimeout);
    vidEndedTimeout = setTimeout(function () {
        $('#player').attr('src', noMediaVideoSrc);
    }, 3000);
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
            if (isStopped) {
                player.pause();
            } else {
                player.play();
            }
            if (!isMobile) {
                player.muted = false;
            }
        }
    } catch (err) {

    }

})

socket.on('getVideo', function (data) {
    clearTimeout(vidEndedTimeout);
    $('#player').attr('src', data.videoData.src);
    isStopped = data.isPaused;
    $("#togglePlay").html("<i class='fa fa-play' aria-hidden='true'></i>")
    $('#videoTitleText').html(data.videoData.title)
    player.loop = false;
})

if (localStorage.volume != null) {
    player.volume = localStorage.volume
    $("#volumeSlider").val(localStorage.volume * 100);
}
document.getElementById('player').onpause = function () {
    $("#togglePlay").html("<i class='fa fa-play' aria-hidden='true'></i>")
    socket.emit("syncVideo");
};
var videoSearchTimeout
$("#videoUrl").keyup(function (event) {
    clearTimeout(videoSearchTimeout);
    var searchMethod = $('#searchMethodSelector').find(":selected").text();
    if (event.keyCode === 13) {
        searchForVideo($("#videoUrl").val(), searchMethod);
    } else {
        if (searchMethod != "Direct Url") {
            videoSearchTimeout = setTimeout(function () {
                searchForVideo($("#videoUrl").val(), searchMethod);
            }, 1000)
        }
    }
    showControls();
});
$("#searchResults").scroll(showControls);
$("#playlist").scroll(showControls);
function searchForVideo(searchStr, searchMethod) {
    if (searchStr) {
        $("#searchResults").html("");
        $("#playlist").hide();
        $("#searchResults").fadeIn(400);
        if (searchMethod == "Youtube") {
            socket.emit("searchYoutube", $("#videoUrl").val());
        } else {
            socket.emit("addVideo", $("#videoUrl").val());
        }
    } else {
        hideSearch();
    }
}
socket.on("searchYoutube", function (results) {
    for (i in results) {
        if (results[i].id.kind == "youtube#video") {
            var result = results[i].snippet;
            var videoUrl = "https://www.youtube.com/watch?v=" + results[i].id.videoId;
            var elem = $("#searchResult0").clone().appendTo("#searchResults");
            elem.attr('class', "searchResult bounceLeft");
            elem.attr('id', "");
            elem.attr('videoUrl', videoUrl);
            elem.click(function () {
                postVideoUrl(this.getAttribute('videoUrl'));
            });
            $(elem).find('.videoTitle').text(result.title);
            $(elem).find('.videoThumbnail').attr('src', result.thumbnails.default.url);
            $(elem).show(400);
        }
    }
    refreshAnimatedElements();
});

function postVideoUrl(url) {
    socket.emit('addVideo', url);
    hideSearch();
}
function hideSearch() {
    $("#searchResults").html("");
    $("#videoUrl").val("");
    $("#playlist").fadeIn(400);
    $("#searchResults").hide();
}
var cachedPlaylist = []
socket.on('updatePlaylist', function (playlist) {
    $("#playlist").html("")
    for (i in playlist) {
        var elem = $("#playListBar0").clone().appendTo("#playlist");
        $(elem).find('.playlistTitle').text(playlist[i].title);

        $(elem).find('.videoUserPhoto').attr('src', playlist[i].profilePicture)

        if (playlist[i].voters.includes(localStorage.username)) {

            $(elem).find(".voteBox").html("Votes   " + playlist[i].vote);
            $(elem).find(".voteBox").addClass("voteBoxRed");
        } else {
            $(elem).find(".voteBox").html("Votes   " + playlist[i].vote);
            $(elem).find(".voteBox").removeClass("voteBoxRed");
            $(elem).find(".voteBox").bind('click', {
                src: playlist[i].src,
                title: playlist[i].title
            }, function (event) {
                var data = event.data;
                vote(data.src);
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
        $("#chatFloatArea").hide();
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
        $("#chatFloatArea").show();
    }
});
