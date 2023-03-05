<h1 align="center">Meta API</h1>
<details open="open">
    <summary>Menu</summary>
    <ol>
        <li><a href="#Install">Install And Use</a></li>
        <li><a href="#Docs">Documentation</a></li>
        <li><a href="#Contact">Contact</a></li>
        <li><a href="#Donate">Donate</a></li>
    </ol>
</details>

<!-- Install -->
## Install
### Install
#### 1. Edit package.json.
- Edit your package.json file as below:
```sh
{
    ...,
    "dependencies": {
        ...,
        "meta-api": "github:hoahenry/meta-api",
        ...
    },
    ...
}
```
- After editing, run: `npm install`
#### 2. Use `npm`
- At command line, enter: `npm install github:hoahenry/meta-api` or `npm i @hoahenry/meta-api`
#### 3. Update
- Use built-in function: `checkUpdate(allowUpdate)`
- If `allowUpdate` is `true`, it will automatically update if a new version is available.

### Use
- Before logging in, I recommend using the `setOptions(options)` function to edit some of the properties available in the API:
```sh
var { setOptions } = require('meta-api');
setOptions({
    // These are the accepted properties in setOptions
    selfListen: false,
    selfListenEvents: false,
    listenEvents: false,
    listenTyping: false,
    updatePresence: false,
    readReceipt: false,
    autoMarkRead: false,
    onlineStatus: false,
    emitReady: true,
    autoReconnect: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
});

// You can login with the above options
```
- You can use function `login(loginData, callback)`.
- Login with Cookies:
```sh
var { login } = require('meta-api');
var { readFileSync } = require('fs');
var cookies = JSON.parse(readFileSync('path_to_cookies.json'));

login({ cookies: cookies }, async function(error, api) {
    if (error) console.log(error);
    else console.log(api);
    // You can use API here
});
```

- Login with your account and password:
```sh
var { login } = require('meta-api');

login({ email: 'your_email_or_facebook_id', password: 'your_password' }, async function (error, api) {
    if (error) console.log(error);
    else console.log(api);
    // You can use API here
});
```
- Or use both methods:
```sh
var { login } = require('meta-api');
var { readFileSync } = require('fs');
var cookies = JSON.parse(readFileSync('path_to_cookies.json'));

function loginHandle(error, api) {
    if (error) return login({ email: 'your_email_or_facebook_id', password: 'your_password' }, loginHandle);
    // You can use API here
}

login({ cookies }, loginHandle);
```

<!-- Docs -->
## Docs
- Building...

<!-- Contact -->
## Contact
- <a href=https://m.me/j/AbbhSpScpDvsVAgT/>Group Meta API Developers</a>

<!-- Donate -->
## Donate

<li>Momo: 0364694797</li>
<li>Total Income: 0</li>
<li>Thank: ...</li>
