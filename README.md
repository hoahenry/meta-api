<h1 align="center">Meta API</h1>
<details open="open">
    <summary>Menu</summary>
    <ol>
        <li><a href="#Introduction">Introduction</a></li>
        <li><a href="#Install">Install And Use</a></li>
        <li><a href="#Docs">Documentation</a></li>
        <li><a href="#Contact">Contact</a></li>
        <li><a href="#Donate">Donate</a></li>
    </ol>
</details>

<!-- Install -->
## Introduction
- Building...

<!-- Install -->
## Install
### 1. Use `npm`
- At command line, enter: `npm i @hoahenry/meta-api`
### 2. Update
- Use built-in function: `checkUpdate(allowUpdate)`
- If `allowUpdate` is `true`, it will automatically update if a new version is available.

## Use
- You can use function `login(loginData, callback)`.
    - `loginData`:
        - `email`: Your email
        - `password`: Your password
        - `cookies`: `Recommend` Your Cookies
        - `configs`:
            - `selfListen`: Default `false` Set this to true if you want your api to receive messages from its own account.
            - `selfListenEvents`: Default `false` Set this to true if you want your api to receive event from its own account.
            - `listenEvents`: Default `true`
            - `listenTyping`: Default `false` return `typ` status.
            - `updatePresence`: Default `false` Will make `api.listen` also return `presence`.
            - `readReceipt`: Default `false` 
            - `autoMarkRead`: Default `false`
            - `onlineStatus`: Default `false`
            - `emitReady`: Default `true`
            - `autoReconnect`: Default `true`
            - `userAgent`: Default `'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'`
    - `callback(error, api)`: Called after login complete, return error or list api
- Login with Cookies:
```sh
var { login } = require('@hoahenry/meta-api');
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
var { login } = require('@hoahenry/meta-api');

login({ email: 'your_email_or_facebook_id', password: 'your_password' }, async function (error, api) {
    if (error) console.log(error);
    else console.log(api);
    // You can use API here
});
```
- Or use both methods:
```sh
var { login } = require('@hoahenry/meta-api');
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
- <a href=https://m.me/s2.henry/>Messenger</a>
- <a href=https://www.facebook.com/s2.henry/>Facebook Profile</a>

<!-- Donate -->
## Donate

<li>Paypal: xuanhoa.henry@gmail.com</li>
<li>Total Income: 0</li>
<li>Thank: ...</li>
