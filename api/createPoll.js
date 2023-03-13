module.exports = function({ requestDefaults, utils }) {
    var { makeCallback, includes } = utils;
    return async function(title, options = {}, threadID, callback) {
        if (!callback) callback = makeCallback();
        if (!threadID || !includes(threadID, 'String', 'Number')) return callback('Please pass a threadID in the third arguments');
        var form = {
            target_id: threadID,
            question_text: title
        }
        var properties = Object.keys(options);
        for (var i = 0; i < properties.length; i++) {
            form['option_text_array[' + i + ']'] = properties[i];
            form['option_is_selected_array[' + i + ']'] = options[properties[i]] ? '1' : '0';
        }
        var response = await requestDefaults.post('https://www.facebook.com/messaging/group_polling/create_poll/?dpr=1', form);
        if (!response || response.error) return callback(response, null);
        else return callback(null, true);
    }
}