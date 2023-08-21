module.exports = function({ request, utils }) {
    return function(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var facebook = request.jar.getCookies('https://www.facebook.com');
        var messenger = request.jar.getCookies('https://www.messenger.com');
        return callback(null, facebook.concat(messenger));
    }
}