var { readdirSync } = require('fs');

module.exports = function({ browser, request, client, log, api, utils }) {
    var apiPath = __dirname + '/';
    return async function(callback) {
        if (!callback || !Function.isFunction(callback)) callback = utils.makeCallback();
        var apiName = readdirSync(apiPath).map(name => name.replace(/\.js/, ''));
        for (let name of apiName) {
            if (require.cache[require.resolve(apiPath + name)]) delete require.cache[require.resolve(apiPath + name)];
            api[name] = require(apiPath + name) ({ browser, request, client, log, api, utils });
        }
        return callback(api);
    }
}