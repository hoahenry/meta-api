module.exports = function({ client, utils }) {
    return function(options, callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var allowedProperties = Object.keys(client.configs), clientConfigProperties = Object.keys(configs);
        if (clientConfigProperties.some(item => !allowedProperties.includes(item))) return callback('setConfigs', 'Unrecognized option given to setOptions: ' + clientConfigProperties.filter(item => !allowedProperties.includes(item)).join(', '));
        clientConfigProperties.filter(item => allowedProperties.includes(item)).forEach(item => client.configs[item] = options[item]);
        return callback(null);
    }
}