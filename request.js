const request = require('bluebird').promisify(require('request').defaults({ jar: true }));
const jar = request.jar();

module.exports = function({ client, utils, log }) {
    function getHeader(url, options) {
        return {
            Referer: "https://www.facebook.com/",
            Host: url.replace("https://", "").split("/").shift(),
            Origin: "https://www.facebook.com",
            "User-Agent": client.configs.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            Connection: "keep-alive",
            "sec-fetch-site": "same-origin",
            'X-MSGR-Region': client.region || '',
            ...options
        }
    }
    
    function get(url, options = {}, queryString = {}) {
        options = Object.assign(options, {
            headers: getHeader(url, options.headers),
            timeout: 60000,
            qs: queryString,
            url,
            method: 'GET',
            jar,
            gzip: true
        });
        return request(options).then(saveCookies);
    }

    function post(url, form = {}, options = {}, queryString = {}) {
        options = Object.assign(options, {
            headers: getHeader(url, options.headers),
            timeout: 60000,
            url,
            method: 'POST',
            jar,
            gzip: true,
            qs: queryString
        })
        if (options.headers && options.headers['Content-Type'] && options.headers['Content-Type'] === 'multipart/form-data') options.formData = form;
        else options.form = form;
        return request(options).then(saveCookies);
    }

    function saveCookies(response) {
        var cookies = response.headers['set-cookie'] || [];
        for (let i of cookies) {
            if (response.request.uri.href.includes('https://www.facebook.com')) jar.setCookie(i.replace(/domain=\.facebook\.com/, "domain=.messenger.com"), 'https://www.messenger.com');
            jar.setCookie(i, response.request.uri.href);
        }
        return response;
    }

    function makeAccountBrowser(html) {
        var { userID } = client, reqCounter = 1, fb_dtsg = utils.getFrom(html, 'name="fb_dtsg" value="', '"'), ttstamp = '2', revision = utils.getFrom(html, 'revision":', ',');
        for (let i = 0; i < fb_dtsg.length; i++) ttstamp += fb_dtsg.charCodeAt(i);
        function mergeWithDefaults(obj) {
            return {
                __user: userID,
                __req: (reqCounter++).toString(36),
                __rev: revision,
                __a: 1,
                fb_dtsg: client.fb_dtsg ? client.fb_dtsg : fb_dtsg,
                jazoest: client.ttstamp ? client.ttstamp : ttstamp,
                ...obj
            }
        }
        function _get(url, options = {}, queryString = {}) {
            return get(url, options, mergeWithDefaults(queryString)).then(parseAndCheckLogin({ get: _get, post: _post, postFormData: _postFormData }));
        }
        function _post(url, form = {}, options = {}, queryString = {}) {
            return post(url, mergeWithDefaults(form), options, queryString).then(parseAndCheckLogin({ get: _get, post: _post, postFormData: _postFormData }));
        }
        function _postFormData(url, form = {}, options = { headers: { "Content-Type": "multipart/form-data" } }, queryString = {}) {
            return post(url, mergeWithDefaults(form), options, mergeWithDefaults(queryString)).then(parseAndCheckLogin({ get: _get, post: _post, postFormData: _postFormData }));
        }
        return {
            get: _get,
            post: _post,
            postFormData: _postFormData
        }
    }

    function parseAndCheckLogin(browser, retryCount = 0) {
        return async function(data) {
            try {
                if (data.statusCode >= 500 && data.statusCode < 600) {
                    retryCount++;
                    if (retryCount === 5) throw new Error(`Got status code: ${data.statusCode}, trial limit exceeded. Bailing out of trying to parse response.`);
                    var retryTime = Math.floor(Math.random() * 5000);
                    var url = data.request.uri.protocol + "//" + data.request.uri.hostname + data.request.uri.pathname;
                    await utils.waitForTimeout(retryTime);
                    if (data.request.headers['Content-Type'].split(';')[0] === 'multipart/form-data') return browser.postFormData(url, data.request.formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(parseAndCheckLogin(browser, retryCount));
                    else return browser.post(url, data.request.formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(parseAndCheckLogin(browser, retryCount));
                }
                if (data.statusCode !== 200) throw new Error(`Got status code: ${data.statusCode}. Bailing out of trying to parse response.`);
                var res = JSON.parse(utils.makeParsable(data.body));
                if (res.error === 1357001) throw new Error('Not logged in.');
                if (res.redirect && res.request.method === 'GET') return browser.get(res.redirect).then(parseAndCheckLogin(browser));
                if (res.jsmods && res.jsmods.require && Array.isArray(res.jsmods.require[0]) && res.jsmods.require[0][0] === 'Cookie') {
                    res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace("_js_", "");
                    var facebookCookie = utils.formatCookie(res.jsmods.require[0][3], "facebook");
                    var messengerCookie = utils.formatCookie(res.jsmods.require[0][3], "messenger");
                    cookieJar.setCookie(facebookCookie, 'https://www.facebook.com');
                    cookieJar.setCookie(messengerCookie, 'https://www.messenger.com');
                    res.jsmods.require.forEach(function(item) {
                        if (item[0] === 'DSTG' && item[1] === 'setToken') {
                            client.fb_dtsg = item[3][0];
                            client.ttstamp = '2';
                            for (let a = 0; a < client.fb_dtsg.length; a++) client.ttstamp += client.fb_dtsg.charCodeAt(a);
                        }
                    });
                }
                return res;
            } catch (error) {
                return log('Account Status', JSON.stringify({ error: error, html: data }, null, 4), 'error');
            }
        }
    }

    return Object.assign(get, {
        get,
        post,
        jar,
        getHeader,
        saveCookies,
        makeAccountBrowser
    })
}