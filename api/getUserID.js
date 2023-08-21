module.exports = function({ request, utils }) {
    var isURL = /^https?:\/\/.*$/, hasUserData = /"props":({.*?})/g;
    return async function(input, callback) {
        var originalURL = 'https://www.facebook.com';
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        if (!input) return callback('Please pass an url in the first argument.');
        if (!isURL.test(input)) originalURL += '/' + input;
        else {
            var _URL = new URL(input);
            originalURL += _URL.pathname.includes('/profile.php') ? `/${_URL.searchParams.get('id')}` : _URL.pathname;
        }
        var { body } = await request.get(originalURL);
        var _m = hasUserData.exec(body);
        if (!_m || !_m[1]) return callback('The userID could not be found using this URL: ' + originalURL)
        var s2j = JSON.parse(_m[1]);
        return callback(null, {
            userVanity: s2j.userVanity || null,
            userID: s2j.userID,
            eligibleForProfilePlusEntityMenu: s2j.eligibleForProfilePlusEntityMenu
        });

    }
}