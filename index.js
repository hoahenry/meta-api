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
var utils = require('./system/utils') ({ Cli, globalOptions, log });
var requestMaker = require('./system/requestMaker') ({ Cli, globalOptions, log, utils });

async function login(loginData, callback) {
    var { cookies, email, password } = loginData;
    var { get, post, makeDefaults, jar } = requestMaker;
    var { getFrom, makeCallback } = utils;
    
    if (!callback) callback = makeCallback();
    if (cookies) {
        log('Login', 'Logging in with cookies...', 'magenta');
        for (let i of cookies) {
            let cookie = (i.key || i.name) + "=" + i.value + "; expires=" + i.expires + "; domain=" + i.domain + "; path=" + i.path + ";";
            jar.setCookie(cookie, 'https://' + i.domain);
        }
    } else {
        log('Login', 'Logging in with email and password...', 'magenta');
        var { body, headers } = await get('https://m.facebook.com/login');
        var $ = cheerio.load(body), arrayForm = [], formData = {};
        $('#login_form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
        for (let i of arrayForm) if (i.value) formData[i.name] = i.value;

        formData.lsd = getFrom(body, "[\"LSD\",[],{\"token\":\"", "\"}");
        formData.lgndim = Buffer.from("{\"w\":1440,\"h\":900,\"aw\":1440,\"ah\":834,\"c\":24}").toString('base64');
        formData.email = email || _readLine('\x1b[33mPlease enter your email or Facebook ID: \x1b[0m');
        formData.pass = password || _readLine('\x1b[33mPlease enter your password: \x1b[0m');
        formData.default_persistent = '0';
        formData.lgnrnd = getFrom(body, "name=\"lgnrnd\" value=\"", "\"");
        formData.locale = 'vi_VN';
        formData.timezone = '-420';
        formData.lgnjs = ~~(Date.now() / 1000);

        var { headers } = await post('https://www.facebook.com/login/device-based/regular/login/?login_attempt=1&lwv=110', formData);
        if (!headers.location) return callback('Wrong email or password', null);
        if (headers.location.includes('/checkpoint/?next')) {
            var { body } = await get(headers.location);
            var $ = cheerio.load(body), arrayForm = [], formData = {};
            $('form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
            for (let i of arrayForm) if (i.value) formData[i.name] = i.value;
            formData['submit[Continue]'] = $("#checkpointSubmitButton").html();
            formData.approvals_code = _readLine('\x1b[33mPlease enter your approvals code or leave it blank if verified with another browser: \x1b[0m', true);
            if (formData.approvals_code) {
                var { headers, body } = await post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData);
                var $ = cheerio.load(body);
                var error = $("#approvals_code").parent().attr("data-xui-error");
                if (error) return callback('Login with email and password failed. Incorrect approvals code', null);
                delete formData.approvals_code;
                formData.name_action_selected = 'dont_save';
                await post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData);
            } else {
                log('Login', 'Verified from browser, continuing to login...', 'magenta');
                await post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData, { Referer: headers.location });
            }
        }
    }
    var { body } = await get('https://m.facebook.com');
    var strAppID = response.body.match(/appID:\s*?(\d*)/), strMQTT = response.body.match(/endpoint:\s*?"(.+?)"/), strMQTTPolling = response.body.match(/pollingEndpoint:\s*?"(.+?)"/), strIrisSeqID = response.body.match(/irisSeqID:\s*?"(.+?)"/);
    if (strAppID) Cli.appID = strAppID[1];
    if (strMQTTPolling) Cli.MQTTPolling = strMQTTPolling[1];
    if (strMQTT) Cli.MQTT = strMQTT[1];
    if (strIrisSeqID) Cli.irisSeqID = strIrisSeqID[1];
    if (Cli.MQTT || Cli.MQTTPolling) Cli.region = Cli.MQTT ? Cli.MQTT.replace(/(.+)region=/g, '') : Cli.MQTTPolling.replace(/(.+)region=/g, '');

    var cookie = jar.getCookies('https://www.facebook.com').filter(item => item.cookieString().split('=')[0] === 'c_user');
    if (cookie.length == 0) return callback('Error retrieving user ID, login your account with browser to check and try again.', null);
    Cli.userID = cookie[0].cookieString().split("=")[1].toString();
    log('Login', 'Logged in with userID: ' + Cli.userID, 'magenta');

    let requestDefaults = makeDefaults(response.body);
    let apiName = readdirSync(__dirname + '/api/'), api = new Object();
    for (let name of apiName) api[name.replace(/.js/g, '')] = require(__dirname + '/api/' + name) ({ requestDefaults, jar, Cli, api, globalOptions, utils, log });

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
    var { body } = await requestMaker.get('https://raw.githubusercontent.com/hoahenry/meta-api/main/package.json');
    var { version: newestVersion } = JSON.parse(body);
    if (versionChecker(version, newestVersion)) {
        log('Update', 'There is a newer version of Meta-API available', 'warn');
        if (allowUpdate) {
            log('Update', 'AllowUpdate is enabled, updating...', 'warn');
            var { execSync } = require('child_process');
            execSync('npm install @hoahenry/meta-api --save');
        }
    }
}

function _readLine(question, nullAnswer) {
    let answer = reader.question(question, { encoding: 'utf-8' });
    return !nullAnswer ? answer.length > 0 ? answer : _readLine(question, nullAnswer) : answer;
}

module.exports = {
    login,
    setOptions,
    checkUpdate
}