var bluebird = require('bluebird');
const request = bluebird.promisify(require('request').defaults({ jar: true }));
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
    
    function get(url, options = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, queryString = {}) {
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

    function post(url, form = {}, options = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, queryString = {}) {
        options = Object.assign(options, {
            headers: getHeader(url, options.headers),
            timeout: 60000,
            queryString: queryString || {},
            url,
            method: 'POST',
            jar,
            gzip: true
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
        if (!fb_dtsg) fb_dtsg = utils.getFrom(html, '["DTSGInitData",[],{"token":"', '"');
        if (!fb_dtsg) fb_dtsg = utils.getFrom(html, '"DTSGInitData":{"token":"', '"');
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
        function _get(url, options = {}, queryString = {}, retry = 0) {
            return get(url, options, mergeWithDefaults(queryString)).then(checkAccountStatus({ get: _get, post: _post, postFormData: _postFormData }, retry));
        }
        function _post(url, form = {}, options = {}, retry = 0) {
            return post(url, mergeWithDefaults(form), options).then(checkAccountStatus({ get: _get, post: _post, postFormData: _postFormData }, retry));
        }
        function _postFormData(url, form = {}, options = { headers: { "Content-Type": "multipart/form-data" } }, queryString = {}, retry = 0) {
            return post(url, mergeWithDefaults(form), options, mergeWithDefaults(queryString)).then(checkAccountStatus({ get: _get, post: _post, postFormData: _postFormData }, retry));
        }
        return {
            get: _get,
            post: _post,
            postFormData: _postFormData
        }
    }

    function checkAccountStatus(browser, retry) {
        return async function(data) {
            try {
                if (data.statusCode >= 500 && data.statusCode < 600) {
                    retry++;
                    if (retry === 5) throw new Error(`Got status code: ${data.statusCode}, trial limit exceeded. Bailing out of trying to parse response.`);
                    var retryTime = Math.floor(Math.random() * 5000);
                    var url = data.request.uri.protocol + "//" + data.request.uri.hostname + data.request.uri.pathname;
                    await utils.waitForTimeout(retryTime);
                    if (data.request.headers['Content-Type'].split(';')[0] === 'multipart/form-data') return browser.postFormData(url, data.request.formData, { headers: { 'Content-Type': 'multipart/form-data' } }, {}, retry);
                    else return browser.post(url, data.request.formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, retry);
                }
                if (data.statusCode !== 200) throw new Error(`Got status code: ${data.statusCode}. Bailing out of trying to parse response.`);
                var res = JSON.parse(utils.makeParsable(data.body));
                if (res.error === 1357001) throw new Error('Not logged in.');
                if (res.redirect && res.request.method === 'GET') return browser.get(res.redirect).then(checkAccountStatus(browser));
                if (res.jsmods && res.jsmods.require && Array.isArray(res.jsmods.require[0]) && res.jsmods.require[0][0] === 'Cookie') {
                    res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace("_js_", "");
                    var facebookCookie = utils.formatCookie(res.jsmods.require[0][3], "facebook");
                    var messengerCookie = utils.formatCookie(res.jsmods.require[0][3], "messenger");
                    jar.setCookie(facebookCookie, 'https://www.facebook.com');
                    jar.setCookie(messengerCookie, 'https://www.messenger.com');
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
                return log('Account Status', error, 'error');
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