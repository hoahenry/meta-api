module.exports = function({ utils }) {
    var { makeCallback, jar } = utils;
    return function(callback) {
        if (!callback) callback = makeCallback();
        var facebook = jar.getCookies('https://www.facebook.com');
        var messenger = jar.getCookies('https://www.messenger.com');
        return callback(null, facebook.concat(messenger));
    }
}