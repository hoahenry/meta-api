module.exports = function({ request, utils, Language }) {
    var isURL = /^https?:\/\/.*$/, hasUserData = /"props":({.*?})/g;
    return async function(input, callback) {
        var originalURL = 'https://www.facebook.com';
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!input) return callback(Language('getUserID', 'needURL'));
        if (!isURL.test(input)) originalURL += '/' + input;
        else {
            var _URL = new URL(input);
            originalURL += _URL.pathname.includes('/profile.php') ? `/${_URL.searchParams.get('id')}` : _URL.pathname;
        }
        var { body } = await request.get(originalURL);
        var _m = hasUserData.exec(body);
        if (!_m || !_m[1]) return callback(Language('getUserID', 'error', originalURL));
        var s2j = JSON.parse(_m[1]);
        return callback(null, {
            userVanity: s2j.userVanity || undefined,
            userID: s2j.userID,
            eligibleForProfilePlusEntityMenu: s2j.eligibleForProfilePlusEntityMenu
        });

    }
}