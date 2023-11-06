module.exports = function({ browser, utils, Language }) {
    var GENDERS = {
        0: "unknown",
        1: "female_singular",
        2: "male_singular",
        3: "female_singular_guess",
        4: "male_singular_guess",
        5: "mixed",
        6: "neuter_singular",
        7: "unknown_singular",
        8: "female_plural",
        9: "male_plural",
        10: "neuter_plural",
        11: "unknown_plural"
    };
    function formatData(obj) {
        return Object.keys(obj).map(function (key) {
            var user = obj[key];
            return {
                alternateName: user.alternateName,
                firstName: user.firstName,
                gender: GENDERS[user.gender],
                userID: utils.formatID(user.id.toString()),
                isFriend: user.is_friend != null && user.is_friend ? true : false,
                fullName: user.name,
                profilePicture: user.thumbSrc,
                type: user.type,
                profileUrl: user.uri,
                vanity: user.vanity,
                isBirthday: !!user.is_birthday
            };
        });
    }

    return async function(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        let response = await browser.postFormData('https://www.facebook.com/chat/user_info_all', { viewer: client.userID });
        return !response ? callback(Language('getFriendList', 'failedGetFriendList')) : response.error ? callback(response) : callback(null, formatData(response.payload));
    }
}