const colors = {
    default: "\x1b[32m[ %type |\x1b[33m %hours \x1b[32m] » %data \x1b[0m",
    warn: "\x1b[33m[ %type |\x1b[33m %hours \x1b[33m] » %data \x1b[0m",
    error: "\x1b[31m[ %type |\x1b[33m %hours \x1b[31m] » %data \x1b[0m",
    green: "\x1b[32m[ %type |\x1b[33m %hours \x1b[32m] » %data \x1b[0m",
    blue: "\x1b[34m[ %type |\x1b[33m %hours \x1b[34m] » %data \x1b[0m",
    magenta: "\x1b[35m[ %type |\x1b[33m %hours \x1b[35m] » %data \x1b[0m",
    cyan: "\x1b[36m[ %type |\x1b[33m %hours \x1b[36m] » %data \x1b[0m",
    white: "\x1b[37m[ %type |\x1b[33m %hours \x1b[37m] » %data \x1b[0m",
    crimson: "\x1b[38m[ %type |\x1b[33m %hours \x1b[38m] » %data \x1b[0m"
}
const allowProperties = Object.keys(colors);

function getTime(format) {
	const _moment = require("moment-timezone").tz("Asia/Ho_Chi_Minh");
    return format ? _moment.format(format) : _moment.format("HH:mm:ss DD/MM/YYYY");
}

module.exports = function(type, data, color) {
    color = color ? allowProperties.includes(color) ? color : 'default' : 'default';
    return console.log(colors[color].replace(/%type/g, type || 'Meta API').replace(/%hours/g, getTime('HH:mm:ss')).replace(/%data/g, data));
}