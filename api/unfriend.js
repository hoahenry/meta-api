module.exports = function({ browser, utils, client, Language }) {
    return async function(userID, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        let form = {
            uid: userID,
            unref: "bd_friends_tab",
            floc: "friends_tab",
            "nctr[_mod]": "pagelet_timeline_app_collection_" + client.userID + ":2356318349:2"
        }
        let response = await browser.post('https://www.facebook.com/ajax/profile/removefriendconfirm.php', form);
        return !response ? callback(Language('unfriend', 'failedUnfriend', userID)) : response.error ? callback(response) : callback(null);
    }
}