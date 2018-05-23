//*************************
//Login system

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
        $(".login-user-img").attr('src', res.profilePicture);
        $("#profilePic").show();
        $("#profileIcon").hide();
        $(".closeLogin").trigger("click");
        $("#loginLink").hide();
        $("#logoutLink").show();
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
        }, 5000)
    }
});
socket.on('forcelogout', function (res) {
    logout();
});

function register() {
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
    $(".closeLogin").trigger("click");
    $("#loginLink").show();
    $("#logoutLink").hide();
    $("#profilePic").hide();
    $("#profileIcon").show();
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
        console.log("test")
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