module.exports = function({ requestDefaults, utils, Cli }) {
    const { makeCallback } = utils;
    return async function(userID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = makeCallback();
        let form = {
            uid: userID,
            unref: "bd_friends_tab",
            floc: "friends_tab",
            "nctr[_mod]": "pagelet_timeline_app_collection_" + Cli.userID + ":2356318349:2"
        }
        let response = await requestDefaults.post('https://www.facebook.com/ajax/profile/removefriendconfirm.php', form);
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}