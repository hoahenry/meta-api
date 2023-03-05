module.exports = function({ globalOptions, utils }) {
    var { makeCallback } = utils;
    return function(options, callback) {
        if (!callback) callback = makeCallback();
        var allowedProperties = Object.keys(globalOptions);
        for (let i of Object.keys(options)) {
            if (!allowedProperties.includes(i)) return callback('Unrecognized option given to setOptions: ' + i, false);
            else globalOptions[i] = options[i];
        }
        return callback(null, true);
    }
}