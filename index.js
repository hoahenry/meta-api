var client = require('./configs');
var log = require('./log');
var cheerio = require('cheerio');
var { readdirSync } = require('fs');
var Language = require('./language/') ({ client, log });
var utils = require('./utils') ({ client, log });
var request = require('./request') ({ client, utils, log });

function setConfigs(configs) {
    var allowedProperties = Object.keys(client.configs), clientConfigProperties = Object.keys(configs);
    if (clientConfigProperties.some(item => !allowedProperties.includes(item))) log('setConfigs', Language('system', 'unrecognizedConfigs', clientConfigProperties.filter(item => !allowedProperties.includes(item)).join(', ')), 'warn');
    clientConfigProperties.filter(item => allowedProperties.includes(item)).forEach(item => client.configs[item] = configs[item]);
}

async function checkUpdate(allowUpdate) {
    var { version } = require('./package.json');
    var { lt: versionChecker } = require('semver');
    var { body } = await request.get('https://raw.githubusercontent.com/hoahenry/meta-api/main/package.json');
    var { version: newestVersion } = JSON.parse(body);
    if (versionChecker(version, newestVersion)) {
        log('Update', Language('system', 'newestVersion'), 'warn');
        if (allowUpdate) {
            log('Update', Language('system', 'autoUpdate'), 'warn');
            var { execSync } = require('child_process');
            execSync('npm install @hoahenry/meta-api --save');
        }
    }
}

async function login({ cookies, email, password, configs, language }, callback) {
    if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
    Language.setLanguage(language || client.language);
    if (configs) setConfigs(configs);
    if (cookies) {
        log('Login', Language('system', 'loginWithCookies'), 'magenta');
        if (!Array.isArray(cookies)) return callback(Language('system', 'cookiesError'));
        for (let i of cookies) {
            let cookie = (i.key || i.name) + "=" + i.value + "; expires=" + i.expires + "; domain=" + i.domain + "; path=" + i.path + ";";
            await request.jar.setCookie(cookie, 'https://' + i.domain);
        }
    } else {
        log('Login', Language('system', 'loginWithEmailAndPassword'), 'magenta');
        var { body } = await request('https://www.facebook.com/login');
        var $ = cheerio.load(body), arrayForm = [], formData = {};
        $('#login_form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
        for (let i of arrayForm) if (i.value) formData[i.name] = i.value;

        formData.lsd = formData.lsd || utils.getFrom(body, "\\[\"LSD\",\\[],{\"token\":\"", "\"}");
        formData.lgndim = Buffer.from("{\"w\":1440,\"h\":900,\"aw\":1440,\"ah\":834,\"c\":24}").toString('base64');
        formData.email = email || utils.readLine('\x1b[33m' + Language('system', 'inputEmail') + '\x1b[0m');
        formData.pass = password || utils.readLine('\x1b[33m' + Language('system', 'inputPassword') + '\x1b[0m');
        formData.default_persistent = '0';
        formData.lgnrnd = formData.lgnrnd || utils.getFrom(body, "name=\"lgnrnd\" value=\"", "\"");
        formData.locale = 'vi_VN';
        formData.timezone = '-420';
        formData.lgnjs = ~~(Date.now() / 1000);

        var { headers } = await request.post('https://www.facebook.com/login/device-based/regular/login/?login_attempt=1&lwv=110', formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        if (!headers.location) return callback(Language('system', 'loginFailed'), null);
        if (headers.location.includes('/checkpoint/?next')) {
            var { body } = await request(headers.location);
            var $ = cheerio.load(body), arrayForm = [], formData = {};
            $('form input').map((key, value) => arrayForm.push({ name: $(value).attr('name'), value: $(value).val() }));
            for (let i of arrayForm) if (i.value) formData[i.name] = i.value;
            formData['submit[Continue]'] = $("#checkpointSubmitButton").html();
            formData.approvals_code = utils.readLine('\x1b[33m' + Language('system', 'enteredApprovalsCode') + '\x1b[0m', true);
            if (formData.approvals_code) {
                var { headers, body } = await request.post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData);
                var $ = cheerio.load(body);
                var error = $("#approvals_code").parent().attr("data-xui-error");
                if (error) return callback(Language('system', 'incorrectApprovalsCode'), null);
                delete formData.approvals_code;
                formData.name_action_selected = 'dont_save';
                var { body } = await request.post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData);
                // There are still some things I can't do here, such as: review recent logins, check checkpoints...
                // If you get the same error, please push an issue to https://github.com/hoahenry/meta-plus/issues
            } else {
                log('Login', Language('system', 'verifiedWithBrowser'), 'magenta');
                var { body } = await request.post('https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php', formData, { headers: { Referer: headers.location } });
                // There are still some things I can't do here, such as: review recent logins, check checkpoints...
                // If you get the same error, please push an issue to https://github.com/hoahenry/meta-plus/issues
            }
        }
    }
    var { body } = await request('https://www.facebook.com/');
    
    var strAppID = body.match(/"?appID"?:\s*?"?(\d*)"?/), strWssEndpoint = body.match(/"(wss:.+?)"/), strPollingEndpoint = body.match(/"?pollingEndpoint"?:\s*?"(.+?)"/), strIrisSeqID = body.match(/"?irisSeqID"?:\s*?"(.+?)"|"?iris_seq_id"?:"(.+?)"/);
    if (strAppID) client.appID = strAppID[1];
    if (strPollingEndpoint) client.pollingEndpoint = strPollingEndpoint[1].replace(/\\/g, '');
    if (strWssEndpoint) client.wssEndPoint = strWssEndpoint[1].replace(/\\/g, '');
    if (strIrisSeqID) client.irisSeqID = strIrisSeqID[1];
    if (client.MQTT || client.pollingEndpoint) client.region = client.MQTT ? client.MQTT.replace(/(.+)region=/g, '') : client.pollingEndpoint.replace(/(.+)region=/g, '');
    
    var cookie = request.jar.getCookies('https://www.facebook.com').filter(item => item.cookieString().split('=')[0] === 'c_user');
    if (cookie.length == 0) return callback(Language('system', 'errorLogin'), null);
    client.userID = cookie[0].cookieString().split("=")[1].toString();
    log('Login', Language('system', 'loggedinWith', client.userID), 'magenta');
    log('Login', Language('system', client.region ? Language('system', 'mqttRegion', client.region.toUpperCase()) : Language('system', 'notFoundMqttRegion')), 'magenta');

    let browser = request.makeAccountBrowser(body);
    let apiName = readdirSync(__dirname + '/api/').filter(name => name.endsWith('.js')).map(name => name.replace(/\.js/, '')), api = {};
    for (let name of apiName) api[name] = require(__dirname + '/api/' + name) ({ browser, request, client, log, api, utils, Language });

    return callback(null, api);
}

module.exports = Object.assign(login, {
    login,
    checkUpdate
})