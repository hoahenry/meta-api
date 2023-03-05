module.exports = function({ requestDefaults, utils }) {
    var { makeCallback } = utils;
    return async function(userID, callback) {
        if (!callback) callback = makeCallback();
        if (!Array.isArray(userID)) userID = [userID];
        var form = {}, obj = {};
        userID.map(function(v, i) {
            form['ids[' + i + ']'] = v;
        })
        var response = await requestDefaults.post('https://www.facebook.com/chat/user_info/', form);
        if (!response || response.error) return callback('Can\'t get User Infomations');
        for (let prop in response.payload.profiles) {
            var innerObj = response.payload.profiles[prop];
            obj[prop] = {
                name: innerObj.name,
                firstNmae: innerObj.firstName,
                vanity: innerObj.vanity,
                thumbSrc: innerObj.thumbSrc,
                profileUrl: innerObj.uri,
                gender: innerObj.gender,
                type: innerObj.type,
                isFriend: innerObj.is_friend,
                isBirthday: !!innerObj.is_birthday,
                searchTokens: innerObj.searchTokens,
                alternateName: innerObj.alternateName
            }
        }
        return callback(null, obj);
    }
}