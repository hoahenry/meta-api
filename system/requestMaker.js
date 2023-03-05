module.exports = function({ Cli, globalOptions, log, utils }) {
    var _bluebird = require('bluebird');
    var _request = require('request').defaults({ jar: true });
    var request = _bluebird.promisify(_request);
    var jar = request.jar();
    var { getType, getFrom, makeParsable, formatCookie } = utils;

    function getHeaders(url, customHeaders) {
        return {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: "https://www.facebook.com/",
            Host: url.replace("https://", "").split("/")[0],
            Origin: "https://www.facebook.com",
            "User-Agent": globalOptions.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            Connection: "keep-alive",
            "sec-fetch-site": "same-origin",
            'X-MSGR-Region': Cli.region || '',
            ...customHeaders
        }
    }

    async function get(url, customHeaders = {}, qs = {}) {
        if (getType(qs) === "Object") {
            for (var prop in qs) {
                qs[prop] = getType(qs[prop]) == 'Object' ? JSON.stringify(qs[prop]) : qs[prop];
            }
        }
        return request({
            headers: getHeaders(url, customHeaders),
            timeout: 60000,
            qs: qs,
            url: url,
            method: "GET",
            jar: jar,
            gzip: true
        }).then(saveCookies);
    }

    async function post(url, form = {}, customHeaders = {}, qs = {}, saveCookie = false) {
        var op = {
            headers: getHeaders(url, customHeaders),
            timeout: 60000,
            url: url,
            method: "POST",
            jar: jar,
            gzip: true,
            qs: qs ? qs : {}
        };
        if (!customHeaders['Content-Type']) op.form = form;
        else {
            op.formData = form;
            op.headers['Content-Type'] = 'multipart/form-data';
        }
        return request(op).then(saveCookies);
    }

    function makeDefaults(html) {
        var { userID } = Cli, reqCounter = 1, fb_dtsg = getFrom(html, 'name="fb_dtsg" value="', '"'), ttstamp = '2', revision = getFrom(html, 'revision":', ',');
        for (let i = 0; i < fb_dtsg.length; i++) ttstamp += fb_dtsg.charCodeAt(i);
        function mergeWithDefaults(obj) {
            return {
                __user: userID,
                __req: (reqCounter++).toString(36),
                __rev: revision,
                __a: 1,
                fb_dtsg: Cli.fb_dtsg ? Cli.fb_dtsg : fb_dtsg,
                jazoest: Cli.ttstamp ? Cli.ttstamp : ttstamp,
                ...obj
            }
        }
        function _get(url, customHeaders = {}, qs = {}) {
            return get(url, customHeaders, mergeWithDefaults(qs), false).then(parseAndCheckLogin({ _get, _post, _postFormData }));
        }
        function _post(url, form = {}, customHeaders = {}) {
            return post(url, mergeWithDefaults(form), customHeaders, null, false).then(parseAndCheckLogin({ _get, _post, _postFormData }));
        }
        function _postFormData(url, form = {}, customHeaders = { "Content-Type": "multipart/form-data" }, qs = {}) {
            return post(url, mergeWithDefaults(form), customHeaders, mergeWithDefaults(qs), false).then(parseAndCheckLogin({ _get, _post, _postFormData }));
        }
        return {
            get: _get,
            post: _post,
            postFormData: _postFormData
        }
    }

    function parseAndCheckLogin(defaults, retryCount = 0) {
        return async function(data) {
            return _bluebird.try(async function() {
                if (data.statusCode >= 500 && data.statusCode < 600) {
                    retryCount++;
                    if (retryCount === 5) return log('Parse And Check Login', `Got status code: ${response.statusCode}. Bailing out of trying to parse response.`, 'error');
                    var retryTime = Math.floor(Math.random() * 5000);
                    var url = data.request.uri.protocol + "//" + data.request.uri.hostname + data.request.uri.pathname;
                    if (data.request.headers['Content-Type'].split(';')[0] === 'multipart/form-data') {
                        return _bluebird.delay(retryTime)
                        .then(function() {
                            return defaults.postFormData(url, data.request.formData);
                        })
                        .then(parseAndCheckLogin(defaults, retryCount))
                    } else {
                        return _bluebird.delay(retryTime)
                        .then(function() {
                            return defaults.post(url, data.request.formData);
                        })
                        .then(parseAndCheckLogin(defaults, retryCount));
                    }
                }
                if (data.statusCode !== 200) return log('Parse And Check Login', `Got status code: ${response.statusCode}. Bailing out of trying to parse response.`, 'error');
                try {
                    var res = JSON.parse(makeParsable(data.body));
                    if (res.error === 1357001) return log('Parse And Check Login', 'Not logged in.', 'error');
                    if (res.redirect && res.request.method === 'GET') return defaults.get(res.redirect).then(parseAndCheckLogin(defaults));
                    if (res.jsmods && res.jsmods.require && Array.isArray(res.jsmods.require[0]) && res.jsmods.require[0][0] === 'Cookie') {
                        res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace("_js_", "");
                        var facebookCookie = formatCookie(res.jsmods.require[0][3], "facebook");
                        var messengerCookie = formatCookie(res.jsmods.require[0][3], "messenger");
                        jar.setCookie(facebookCookie, 'https://www.facebook.com');
                        jar.setCookie(messengerCookie, 'https://www.messenger.com');
                        res.jsmods.require.forEach(function(item) {
                            if (item[0] === 'DSTG' && item[1] === 'setToken') {
                                Cli.fb_dtsg = item[3][0];
                                Cli.ttstamp = '2';
                                for (let a = 0; a < Cli.fb_dtsg.length; a++) Cli.ttstamp += Cli.fb_dtsg.charCodeAt(a);
                            }
                        });
                    }
                    return res;
                } catch (error) {
                    return log('Parse And Check Login', `Got an error. Bailing out of trying to parse response.`, 'error');
                }
            })
        }
    }

    function saveCookies(response) {
        var cookies = response.headers['set-cookie'] || [];
        for (let i of cookies) {
            if (i.includes('.facebook.com')) jar.setCookie(i, "https://www.facebook.com");
            i = i.replace(/domain=\.facebook\.com/, "domain=.messenger.com");
            jar.setCookie(i, 'https://www.messenger.com');
        }
        return response;
    }

    return {
        jar,
        get,
        post,
        getHeaders,
        makeDefaults,
        parseAndCheckLogin,
        saveCookies
    }
}