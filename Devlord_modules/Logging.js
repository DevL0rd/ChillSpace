//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
//Last Update: 4/19/2018
//Version: 1.2.0
var fs = require('fs');
var cc = require('./conColors.js');
var NameSpace = "Devlord Project";
var LoggingDir = "./Logs";
var consoleLogging = true;
var errorLogging = true;
var consoleLogging = true;
var errorLogging = true;
var logging = true;
var consolePrinting = true;
var errorPrinting = true;
var printing = true;
var consoleNamespacePrintFilter = [];
var errorNamespacePrintFilter = [];
function setLoggingDir(str) {
    LoggingDir = str;
    if (!fs.existsSync(LoggingDir)) {
        fs.mkdirSync(LoggingDir);
    }
}
function setNamespace(str) {
    NameSpace = str;
}
function setLogging(bool) {
    logging = bool;
}
function logConsole(bool) {
    consoleLogging = bool;
}
function logErrors(bool) {
    errorLogging = bool;
}

function printConsole(bool) {
    consolePrinting = bool;
}

function printErrors(bool) {
    errorPrinting = bool;
}

function setPrinting(bool) {
    printing = bool;
}
function setConsoleNamespacePrintFilter(filter) {
    consoleNamespacePrintFilter = filter;
}
function setErrorNamespacePrintFilter(filter) {
    errorNamespacePrintFilter = filter;
}

function timeStamp() {
    // Create a date object with the current time
    var now = new Date();

    // Create an array with the current month, day and time
    var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];

    // Create an array with the current hour, minute and second
    var time = [now.getHours(), now.getMinutes(), now.getSeconds()];

    // Determine AM or PM suffix based on the hour
    var suffix = (time[0] < 12) ? "AM" : "PM";

    // Convert hour from military time
    time[0] = (time[0] < 12) ? time[0] : time[0] - 12;

    // If hour is 0, set it to 12
    time[0] = time[0] || 12;

    // If seconds and minutes are less than 10, add a zero
    for (var i = 1; i < 3; i++) {
        if (time[i] < 10) {
            time[i] = "0" + time[i];
        }
    }

    // Return the formatted string
    return date.join("/") + " " + time.join(":") + " " + suffix;
}

function isEven(n) {
    n = Number(n);
    return n === 0 || !!(n && !(n % 2));
}

function isOdd(n) {
    return isEven(Number(n) + 1);
}
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function formatAndColorString(NameSpaceStr, str, isError) {
    var now = new Date();
    var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
    var TodaysDate = date.join("-");
    var formattedPrefixColored = cc.style.bright + cc.fg.white + "[" + cc.fg.blue + timeStamp() + cc.fg.white + "] (" + cc.fg.magenta + NameSpaceStr + cc.fg.white + "): ";
    var loggedStrColor = cc.fg.white;
    if (isError) loggedStrColor = cc.fg.red;
    var cstringColoredQuotes = str.replace(/\'.*\'/, cc.style.underscore + cc.fg.cyan + '$&' + cc.reset + cc.style.bright + loggedStrColor);
    return formattedPrefixColored + loggedStrColor + cstringColoredQuotes + cc.reset + cc.fg.white;
}

function formatString(str, NameSpaceStr) {
    var formattedString = "[" + timeStamp() + "] (" + NameSpaceStr + "): " + str;
    return "\r\n" + formattedString;
}
function log(str, isError = false, NameSpaceStr = NameSpace) {
    setTimeout(function () {
        str = "" + str;
        if (printing) {
            if (isError) {
                if (errorPrinting && !errorNamespacePrintFilter.includes(NameSpaceStr)) {
                    console.log(formatAndColorString(NameSpaceStr, str, isError));
                }
            } else {
                if (consolePrinting && !consoleNamespacePrintFilter.includes(NameSpaceStr)) {
                    console.log(formatAndColorString(NameSpaceStr, str, isError));
                }
            }
        }
        var formattedString = formatString(str, NameSpaceStr);
        if (logging) {
            var now = new Date();
            var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
            var TodaysDate = date.join("-");
            if (consoleLogging) {
                fs.appendFile(LoggingDir + "/" + NameSpaceStr + "_C-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
                fs.appendFile(LoggingDir + "/" + "C-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
            }
            if (isError) {
                fs.appendFile(LoggingDir + "/" + "E-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
                fs.appendFile(LoggingDir + "/" + NameSpaceStr + "_E-Out_" + TodaysDate + ".txt", formattedString, function (err) { });
            }
        }
    }, 0);
}

exports.log = log;
exports.setNamespace = setNamespace;
exports.setLoggingDir = setLoggingDir;
exports.logConsole = logConsole;
exports.logErrors = logErrors;
exports.setLogging = setLogging;
exports.setPrinting = setPrinting;
exports.printConsole = printConsole;
exports.printErrors = printErrors;
exports.setConsoleNamespacePrintFilter = setConsoleNamespacePrintFilter;
exports.setErrorNamespacePrintFilter = setErrorNamespacePrintFilter;