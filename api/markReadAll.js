module.exports = function({ utils, browser, Language }) {
    return async function(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var response = await browser.post('https://www.facebook.com/ajax/mercury/mark_folder_as_read.php', { folder: 'inbox' });
        return !response ? callback(Language('markReadAll', 'failedMarkReadAll')) : response.error ? callback(response) : callback(null);
    }
}