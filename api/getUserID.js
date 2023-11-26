module.exports = function({ request, utils, Language }) {
    var isURL = /^https?:\/\/.*$/, hasUserData = /"props":({.*?})/g;
    
    function buildURL(input) {
        const baseURL = 'https://www.facebook.com/';
        const trimmedInput = input.trim();
        if (!isURL.test(trimmedInput)) return baseURL + trimmedInput;
    
        const urlObject = new URL(trimmedInput);
        const path = urlObject.pathname.includes('/profile.php') ? urlObject.searchParams.get('id') : urlObject.pathname;
        return baseURL + path;
    }
    
    function extractUserData(body) {
        const match = hasUserData.exec(body);
        if (!match || !match[1]) throw new Error(Language('getUserID', 'error', originalURL));
    
        const userDataJson = JSON.parse(match[1]);
        return {
            userVanity: userDataJson.userVanity || undefined,
            userID: userDataJson.userID,
            eligibleForProfilePlusEntityMenu: userDataJson.eligibleForProfilePlusEntityMenu
        };
    }

    return async function getUserID(input, callback) {
        try {
            if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
            if (!input.trim()) return callback(Language('getUserID', 'needURL'));
    
            const originalURL = buildURL(input);
            const { body } = await request.get(originalURL);
            const userData = extractUserData(body);
            return callback(null, userData);
        } catch (error) {
            return callback(error.message);
        }
    }
}