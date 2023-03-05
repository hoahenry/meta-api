var log = require('./system/log');
var cheerio = require('cheerio');
var reader = require('readline-sync');
var { readdirSync } = require('fs');

var globalOptions = {
    selfListen: false,
    selfListenEvents: false,
    listenEvents: false,
    listenTyping: false,
    updatePresence: false,
    readReceipt: false,
    autoMarkRead: false,
    onlineStatus: false,
    emitReady: true,
    autoReconnect: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
};
var Cli = {
    clientID: (Math.random() * 2147483648 | 0).toString(16)
};

async function login(loginData, callback) {
    var utils = require('./system/utils') ({ Cli, globalOptions, log });
    var requestMaker = require('./system/requestMaker') ({ Cli, globalOptions, log, utils });
    var { cookies, email, password } = loginData, response;
    var { get, post, makeDefaults, jar } = requestMaker;
    var { getFrom, makeCallback } = utils;
    
    if (!callback) callback = makeCallback();
    if (cookies) {
        log('Login', 'Logging in with cookies...', 'magenta');
        for (let i of cookies) {
            let cookie = (i.key || i.name) + "=" + i.value + "; expires=" + i.expires + "; domain=" + i.domain + "; path=" + i.path + ";";
            jar.setCookie(cookie, 'https://' + i.domain);
        }
        response = await get('https://m.facebook.com');
    } else {
        if (!email) email = _emailHandle();
        if (!password) password = _passwordHandle();
        log('Login', 'Logging in with email and password...', 'magenta');

        var { body, headers } = await get('https://m.facebook.com/login');
        var $ = cheerio.load(body), arrayForm = [], formData = {};
        $('#login_form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
        for (let i of arrayForm) if (i.value) formData[i.name] = i.value;

        formData.lsd = getFrom(body, "[\"LSD\",[],{\"token\":\"", "\"}");
        formData.lgndim = Buffer.from("{\"w\":1440,\"h\":900,\"aw\":1440,\"ah\":834,\"c\":24}").toString('base64');
        formData.email = email;
        formData.pass = password;
        formData.default_persistent = '0';
        formData.lgnrnd = getFrom(body, "name=\"lgnrnd\" value=\"", "\"");
        formData.locale = 'vi_VN';
        formData.timezone = '-420';
        formData.lgnjs = ~~(Date.now() / 1000);

        var { headers } = await post('https://www.facebook.com/login/device-based/regular/login/?login_attempt=1&lwv=110', formData);
        if (!headers.location) return callback('Wrong email or password', null);
        response = await get('https://m.facebook.com');
    }
    var strAppID = response.body.match(/appID:\s*?(\d*)/), strMQTT = response.body.match(/endpoint:\s*?"(.+?)"/), strMQTTPolling = response.body.match(/pollingEndpoint:\s*?"(.+?)"/), strIrisSeqID = response.body.match(/irisSeqID:\s*?"(.+?)"/);
    if (strAppID) Cli.appID = strAppID[1];
    if (strMQTTPolling) Cli.MQTTPolling = strMQTTPolling[1];
    if (strMQTT) Cli.MQTT = strMQTT[1];
    if (strIrisSeqID) Cli.irisSeqID = strIrisSeqID[1];
    if (Cli.MQTT || Cli.MQTTPolling) Cli.region = Cli.MQTT ? Cli.MQTT.replace(/(.+)region=/g, '') : Cli.MQTTPolling.replace(/(.+)region=/g, '');

    var cookie = jar.getCookies('https://www.facebook.com').filter(item => item.cookieString().split('=')[0] === 'c_user');
    if (cookie.length == 0) return callback('Error retrieving user ID, login your account with browser to check and try again.', null);
    Cli.userID = cookie[0].cookieString().split("=")[1].toString();
    log('LOGIN', 'Logged in with userID: ' + Cli.userID, 'magenta');

    let requestDefaults = makeDefaults(response.body);
    let apiName = readdirSync(__dirname + '/api/'), api = new Object();
    for (let name of apiName) api[name.replace(/.js/g, '')] = require(__dirname + '/api/' + name) ({ requestDefaults, Cli, api, globalOptions, utils, log });

    return callback(null, api);
}

function setOptions(options) {
    var allowedProperties = Object.keys(globalOptions);
    for (let i of Object.keys(options)) {
        if (!allowedProperties.includes(i)) log('setOptions', 'Unrecognized option given to setOptions: ' + i);
        else globalOptions[i] = options[i];
    }
}

async function checkUpdate(allowUpdate) {
    var { version } = require('./package.json');
    var { lt: versionChecker } = require('semver');
    var { body } = utils.get('https://raw.githubusercontent.com/hoahenry/meta-api/main/package.json');
    var { version: newestVersion } = JSON.parse(body);
    if (versionChecker(version, newestVersion)) {
        log('Update', 'There is a newer version of Meta-API available', 'warn');
        if (allowUpdate) {
            log('Update', 'AllowUpdate is enabled, updating...', 'warn');
            var { execSync } = require('child_process');
            execSync('npm install github:hoahenry/meta-api');
        }
    }
}

function _emailHandle() {
    let email = reader.question("Please enter your email or Facebook ID: ");
    process.stdout.write("\u001b[0J\u001b[1J\u001b[2J\u001b[0;0H\u001b[0;0W");
    if (email.length > 0) return email;
    else return _emailHandle();
}

function _passwordHandle() {
    let password = reader.question('Please enter your password: ');
    process.stdout.write("\u001b[0J\u001b[1J\u001b[2J\u001b[0;0H\u001b[0;0W");
    if (password.length > 0) return password;
    else return _passwordHandle();
}

module.exports = {
    login,
    setOptions,
    checkUpdate
}