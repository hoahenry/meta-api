module.exports = function({ browser, utils, client, api }) {
    async function disconnect(callback) {
        if (api.disconnect) return api.disconnect(callback);
        if (client.mqtt) {
            client.mqtt.unsubscribe("#");
            client.mqtt.publish("/browser_close", "{}");
            client.removeAllListeners();
            client.mqtt.end();
            delete client.mqtt;
            if (api.disconnect) delete api.disconnect;
        }
        return callback();
    }
    return async function(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var response = await browser.post("https://www.facebook.com/bluebar/modern_settings_menu/?help_type=364455653583099&show_contextual_help=1", { pmid: '0' });
        const elem = response.jsmods.instances[0][2][0].filter(function (v) {
            return v.value === "logout";
        })[0];
        const html = response.jsmods.markup.filter(function (v) {
            return (v[0].includes(elem.markup.__m) || v[0] === elem.markup.__m);
        })[0][1].__html;
        const form = {
            fb_dtsg: utils.getFrom(html, '"fb_dtsg" value="', '"'),
            ref: utils.getFrom(html, '"ref" value="', '"'),
            h: utils.getFrom(html, '"h" value="', '"')
        };
        return disconnect(async function() {
            var response = await browser.post("https://www.facebook.com/logout.php", form);
            if (!response.headers) return callback('An error occurred when logging out.');
            var response = await browser.get(response.headers.location);
            return callback('Logged out successfully.');
        })
    }
}