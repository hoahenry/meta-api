var { readdirSync, existsSync } = require('fs');

function formatRegionToLanguageName(region) {
    var regionNameMap = {
        vi_VN: "Tiếng Việt",
        en_US: "English"
    };
    return regionNameMap[region];
}

module.exports = function({ client, log }) {
    var locale = client.language, data = {}, dirName = __dirname + '/';

    function get(region, key, ...item) {
        if (!data[region]) return get('system', 'notFoundRegion', region, formatRegionToLanguageName(locale));
        if (!data[region][key]) return get('system', 'notFoundKey', key, region, formatRegionToLanguageName(locale));
        let templateText = data[region][key], count = item.length;
        for (let key of item.reverse()) templateText = templateText.replace(new RegExp('%' + count--, 'g'), key);
        return templateText;
    }

    function set(region, obj) {
        return data[region] = { ...data[region] || {}, ...obj };
    }

    function setLanguage(_locale) {
        locale = _locale;
        return init();
    }

    function getLanguageInformations() {
        return {
            locale,
            regionFormat: formatRegionToLanguageName(locale),
            languageAvailable: readdirSync(dirName).filter(item => item.includes('.json')).length
        }
    }
    
    var getLocale = () => locale;

    var Language = function(region, key, ...item) {
        return get(region, key, ...item);
    };

    function init() {
        if (require.cache[require.resolve(dirName + locale + '.json')]) delete require.cache[require.resolve(dirName + locale + '.json')];
        if (!existsSync(dirName + locale + '.json')) locale = client.language;
        let languageData = require(dirName + locale + '.json');
        Object.keys(languageData).forEach(region => set(region, languageData[region]));
        var regionFormat = formatRegionToLanguageName(locale);
        log('Meta API', Language('system', 'languageSelected', regionFormat, process.cwd() + '\\configs.json'), 'warn')
    }

    return Object.assign(Language, {
        get,
        set,
        getLocale,
        setLanguage,
        getLanguageInformations
    });
}