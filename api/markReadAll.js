module.exports = function({ utils, requestDefaults }) {
    return async function(callback) {
        if (!callback) callback = utils.makeCallback();
        var response = await requestDefaults.post('https://www.facebook.com/ajax/mercury/mark_folder_as_read.php', { folder: 'inbox' });
        if (!response || response.error) return callback(response);
        return callback(null);
    }
}