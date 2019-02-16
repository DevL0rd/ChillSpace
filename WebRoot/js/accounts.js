//*************************
//Login system
//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var isRegistering = false;
$("#logoutLink").hide();
socket.on('loginResponse', function (res) {
    if (res == "failed") {
        //could not log in
        $("#loginOutput").html("Invalid credentials.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("")
            $("#loginOutput").css('color', 'white');
        }, 5000);
        localStorage.email = "";
        localStorage.username = "";
        localStorage.persistentLoginKey = "";
    } else {
        localStorage.persistentLoginKey = res.persistentLoginKey;
        localStorage.username = res.username;
        $("#profilePic").attr('src', res.profilePicture);
        $("#loginImg").attr('src', res.profilePicture);
        $("#profileImg").attr('src', res.profilePicture); //profile editor
        $("#profileIcon").hide();
        $("#profilePic").show();
        $("#loginLink").hide();
        $("#logoutLink").show();
        $("#loginInputs").hide(400);
        $("#loginGreeting").html("<h1>Welcome Back!</h1>");
        socket.emit("getPermissions");
        setTimeout(function () {
            $("#closeLogin").trigger("click");
            setTimeout(function () {
                $("#loginInputs").show();
                $("#loginGreeting").html(" <h1>Please Login</h1><span>Logging in enables you to share videos and to join in chat!</span>");
            }, 400);
        }, 3000);
    }
});


socket.on('registerResponse', function (res) {
    if (res == "emailExists") {
        //email is already registered
        $("#loginOutput").html("This email is already in use.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("");
            $("#loginOutput").css('color', 'white');
        }, 5000);
    } else if (res == "usernameExists") {
        //email is already registered
        $("#loginOutput").html("This username is already in use.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("");
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if (res == "invalidReferal") {
        //email is already registered
        $("#loginOutput").html("This is not a valid referal.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("");
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if (res == "registered") {
        //email was succesfully registered
        $("#loginOutput").html("Account created.");
        $("#loginOutput").css('color', 'green');
        setTimeout(function () {
            $("#loginOutput").html("");
            $("#loginOutput").css('color', 'white');
            $("#login_passwordcheck").hide();
            $("#login_username").hide();
            $("#login_button").text("Login");
            $("#register_button").show();
            isRegistering = false;
        }, 1000)
    }
});
socket.on('forcelogout', function (res) {
    logout();
});
var getImageTimeout
$("#login_email").on("change paste keyup", function () {
    clearTimeout(getImageTimeout);
    if ($("#login_email").val().includes("@") && $("#login_email").val().includes(".")) {
        getImageTimeout = setTimeout(function () {
            socket.emit("getProfilePicture", $("#login_email").val())
        }, 500);
    }
});
socket.on("getProfilePicture", function (imgSrc) {
    $("#loginImg").attr('src', imgSrc);
    $("#profileImg").attr('src', imgSrc);//profile editor

});

function register() {
    var urlVars = getUrlVars();
    //verify registration info is valid
    if ($("#login_email").val().length < 6 || !$("#login_email").val().includes("@")) {
        $("#loginOutput").html("Invalid email address.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_username").val().length < 3) {
        $("#loginOutput").html("Username is less than 3 characters.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("")
            $("#loginOutput").css('color', 'white');
        }, 5000)

    } else if ($("#login_username").val().includes(" ") || $("#login_username").val().includes("   ")) {
        $("#loginOutput").html("Username cannot contain spaces.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_pswd").val() != $("#login_passwordcheck").val()) {
        $("#loginOutput").html("Passwords do not match.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("")
            $("#loginOutput").css('color', 'white');
        }, 5000)
    } else if ($("#login_pswd").val().length < 4) {
        $("#loginOutput").html("Password is less than 4 characters.");
        $("#loginOutput").css('color', 'red');
        setTimeout(function () {
            $("#loginOutput").html("")
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
    $("#loginLink").show();
    $("#logoutLink").hide();
    $("#profilePic").hide();
    $("#profileIcon").show();
    $("#loginLink").trigger("click");
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
            $("#loginOutput").html("")
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
    $("#login_passwordcheck").show();
    $("#login_username").show();
    $("#login_button").text("Register");
    $("#register_button").hide();
    isRegistering = true;
    $("#loginOutput").css('color', 'white');
}


socket.on('unregistered', function (res) {
    //account was unregistered.

});
socket.on('connectionCount', function (connectionCount) {
    $("#onlineCount").html(connectionCount);
});
var onlineUsers = {};
socket.on('userLoggedOn', function (userData) {
    addToUserList(userData);
});
socket.on('userLoggedOff', function (email) {
    if (onlineUsers[email] != null) {
        onlineUsers[email].elem.remove();
        delete onlineUsers[email];
    }
});
socket.on('updateUser', function (userData) {
    addToUserList(userData);
})

function addToUserList(userData) {
    if (localStorage.email != userData.email && onlineUsers[userData.email] == null) {
        var elem = $("#userBar0").clone().appendTo("#onlineUsers");
        $(elem).find('.userBarName').text(userData.username);
        $(elem).attr("class", "userBar dropdown-item");
        onlineUsers[userData.email] = {
            elem: elem,
            userdata: userData
        };
        $(elem).find('.userBarPhoto').attr('src', userData.profilePicture)
    }
}

function submitProfilePicture() {
    var file = document.querySelector('#profilePicInput[type="file"]').files[0];
    getBase64(file, function (b64) {
        socket.emit("changeProfilePicture", b64);
    });
}
socket.on("changeProfilePicture", function (newPic) {
    if (newPic) {
        $("#profilePic").attr('src', newPic);
        $("#loginImg").attr('src', newPic);
        $("#profileImg").attr('src', newPic);
        $("#profileOutput").css('color', 'green');
        $("#profileOutput").html("Profile photo updated!");
        setTimeout(function () {
            $("#profileOutput").html("");
            $("#profileOutput").css('color', 'white');
            $("#closePE").trigger("click");
        }, 3000);
    } else {
        $("#profileOutput").html("Invalid image.");
        $("#profileOutput").css('color', 'red');
        setTimeout(function () {
            $("#profileOutput").html("");
            $("#profileOutput").css('color', 'white');
        }, 5000);
    }
});




function getBase64(file, callb) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
        callb(reader.result);
    };
    reader.onerror = function (error) {
        console.log('Error: ', error);
    };
}
