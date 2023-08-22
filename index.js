var client = {
    configs: {
        pageID: null,
        selfListen: true,
        selfListenEvents: true,
        listenEvents: true,
        listenTyping: false,
        updatePresence: false,
        readReceipt: false,
        autoMarkRead: false,
        onlineStatus: true,
        emitReady: true,
        autoReconnect: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    }
}
var log = require('./log');
var cheerio = require('cheerio');
var { readdirSync } = require('fs');
var utils = require('./utils') ({ client, log });
var request = require('./request') ({ client, utils, log });

function setConfigs(configs) {
    var allowedProperties = Object.keys(client.configs), clientConfigProperties = Object.keys(configs);
    if (clientConfigProperties.some(item => !allowedProperties.includes(item))) log('setConfigs', 'Unrecognized option given to setOptions: ' + clientConfigProperties.filter(item => !allowedProperties.includes(item)).join(', '));
    clientConfigProperties.filter(item => allowedProperties.includes(item)).forEach(item => client.configs[item] = options[item]);
}

module.exports.checkUpdate = async function checkUpdate(allowUpdate) {
    var { version } = require('./package.json');
    var { lt: versionChecker } = require('semver');
    var { body } = await request('https://raw.githubusercontent.com/hoahenry/meta-api/main/package.json');
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

module.exports = async function login({ cookies, email, password, configs}, callback) {
    if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
    if (configs) setConfigs(configs);
    if (cookies) {
        log('Login', 'Logging in with cookies...', 'magenta');
        if (!Array.isArray(cookies)) return callback('Cookies must be an Array');
        for (let i of cookies) {
            let cookie = (i.key || i.name) + "=" + i.value + "; expires=" + i.expires + "; domain=" + i.domain + "; path=" + i.path + ";";
            await request.jar.setCookie(cookie, 'https://' + i.domain);
        }
    } else {
        log('Login', 'Logging in with email and password...', 'magenta');
        var { body } = await request('https://m.facebook.com/login');
        var $ = cheerio.load(body), arrayForm = [], formData = {};
        $('#login_form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
        for (let i of arrayForm) if (i.value) formData[i.name] = i.value;

        formData.lsd = formData.lsd || utils.getFrom(body, "\\[\"LSD\",\\[],{\"token\":\"", "\"}");
        formData.lgndim = Buffer.from("{\"w\":1440,\"h\":900,\"aw\":1440,\"ah\":834,\"c\":24}").toString('base64');
        formData.email = email || utils.readLine('\x1b[33mPlease enter your email or Facebook ID: \x1b[0m');
        formData.pass = password || utils.readLine('\x1b[33mPlease enter your password: \x1b[0m');
        formData.default_persistent = '0';
        formData.lgnrnd = formData.lgnrnd || utils.getFrom(body, "name=\"lgnrnd\" value=\"", "\"");
        formData.locale = 'vi_VN';
        formData.timezone = '-420';
        formData.lgnjs = ~~(Date.now() / 1000);

        var { headers } = await request.post('https://www.facebook.com/login/device-based/regular/login/?login_attempt=1&lwv=110', formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        if (!headers.location) return callback('Wrong email or password.', null);
        if (headers.location.includes('/checkpoint/?next')) {
            var { body } = await request(headers.location);
            var $ = cheerio.load(body), arrayForm = [], formData = {};
            $('form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
            for (let i of arrayForm) if (i.value) formData[i.name] = i.value;
            formData['submit[Continue]'] = $("#checkpointSubmitButton").html();
            formData.approvals_code = utils.readLine('\x1b[33mPlease enter your approvals code or leave it blank if verified with another browser: \x1b[0m', true);
            if (formData.approvals_code) {
                var { headers, body } = await request.post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData);
                var $ = cheerio.load(body);
                var error = $("#approvals_code").parent().attr("data-xui-error");
                if (error) return callback('Login with email and password failed. Incorrect approvals code', null);
                delete formData.approvals_code;
                formData.name_action_selected = 'dont_save';
                var { body } = await request.post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData);
                // There are still some things I can't do here, such as: review recent logins, check checkpoints...
                // If you get the same error, please push an issue to https://github.com/hoahenry/meta-plus/issues
            } else {
                log('Login', 'Verified from browser, continuing to login...', 'magenta');
                var { body } = await request.post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData, { headers: { Referer: headers.location } });
                // There are still some things I can't do here, such as: review recent logins, check checkpoints...
                // If you get the same error, please push an issue to https://github.com/hoahenry/meta-plus/issues
            }
        }
    }
    var { body, headers } = await request('https://m.facebook.com/');
    
    var strAppID = body.match(/appID:\s*?(\d*)/), strWssEndpoint = body.match(/"(wss:\/\/.+?)"/), strPollingEndpoint = body.match(/pollingEndpoint:\s*?"(.+?)"/), strIrisSeqID = body.match(/irisSeqID:\s*?"(.+?)"/);
    if (strAppID) client.appID = strAppID[1];
    if (strPollingEndpoint) client.pollingEndpoint = strPollingEndpoint[1];
    if (strWssEndpoint) client.wssEndPoint = strWssEndpoint[1];
    if (strIrisSeqID) client.irisSeqID = strIrisSeqID[1];
    if (client.MQTT || client.pollingEndpoint) client.region = client.MQTT ? client.MQTT.replace(/(.+)region=/g, '') : client.pollingEndpoint.replace(/(.+)region=/g, '');
    
    var cookie = request.jar.getCookies('https://www.facebook.com').filter(item => item.cookieString().split('=')[0] === 'c_user');
    if (cookie.length == 0) return callback('Error retrieving user ID, login your account with browser to check and try again.', null);
    client.userID = cookie[0].cookieString().split("=")[1].toString();
    log('Login', 'Logged in with userID: ' + client.userID, 'magenta');
    log('Login', `Your MQTT Region: ${client.region ? client.region.toUpperCase() : 'Not Found.'}`, 'magenta');

    log('Login', 'Creating an environment variable for the account...', 'magenta');
    let browser = request.makeAccountBrowser(body);
    let apiName = readdirSync(__dirname + '/api/').map(name => name.replace(/\.js/, '')), api = {};
    for (let name of apiName) api[name] = require(__dirname + '/api/' + name) ({ browser, request, client, log, api, utils });

    return callback(null, api);
}