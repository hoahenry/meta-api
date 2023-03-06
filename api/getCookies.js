module.exports = function({ utils, jar }) {
    var { makeCallback } = utils;
    return function(callback) {
        if (!callback) callback = makeCallback();
        var facebook = jar.getCookies('https://www.facebook.com');
        var messenger = jar.getCookies('https://www.messenger.com');
        return callback(null, facebook.concat(messenger));
    }
}