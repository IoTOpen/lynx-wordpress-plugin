# IoT Open Lynx for WordPress

A WordPress block that shows live values from [IoT Open Lynx](https://iotopen.se) –
temperatures, water levels, energy meters, door sensors or anything else you have
as a function in Lynx.

## Features

- Pick backend → installation → device → function from drop-downs in the block editor.
- Value is rendered on the server (works without JavaScript, no layout jump) and
  refreshed in the browser at a configurable interval, with an optional countdown bar.
- Formatting follows the function in Lynx: `meta.format` (printf style) for numeric
  values, and state texts for switches, doors, movement and boolean functions.
- Optionally show function, device and installation names and when the value was last updated.
  Set `wp_name` in Lynx metadata to override the name shown on the site.
- Several Lynx backends can be configured, using an API key or the public API.

## Security model

The API key is stored in WordPress and never sent to the browser. Visitors only talk
to WordPress:

- The routes that list installations, devices and functions require a logged-in user
  who can edit posts.
- The public `/wp-json/iot-open-lynx/v1/data` route only answers for the exact
  backend/installation/function combinations that are published in a block. Each block
  carries an HMAC signature created with the site's secret keys.
- Responses from Lynx are cached in transients (values 10 s, metadata 5 min), so a
  popular page does not turn into a flood of API calls.

Use an API key with the least access needed, preferably a dedicated read-only user.

## Installation

Download `iot-open-lynx.zip` from the [latest release](https://github.com/IoTOpen/lynx-wordpress-plugin/releases)
and upload it under **Plugins → Add New → Upload Plugin**. Then go to
**Settings → IoT Open Lynx**, add a backend and use **Test connection**.

Requires WordPress 6.7 and PHP 7.4 or later.

## Development

```bash
npm install
npm run start        # watch mode
npm run build        # production build into build/
npm run lint:js
npm run plugin-zip   # creates iot-open-lynx.zip
```

To try it out, symlink or copy the repository into `wp-content/plugins/iot-open-lynx`
of a local WordPress.

Layout:

| Path | What |
| --- | --- |
| `iot-open-lynx.php` | Plugin bootstrap |
| `includes/class-client.php` | Lynx API client (WordPress HTTP API + transient cache) |
| `includes/data.php` | Backend config, value lookup and formatting |
| `includes/rest.php` | REST routes used by the editor and the front end |
| `includes/block.php` | Block registration and server-side rendering |
| `includes/settings.php` | Settings registration and admin page |
| `src/iot-open-lynx/` | The block: `block.json`, editor (`edit.js`), front-end updater (`view.js`), styles |
| `src/settings.js` | Settings page UI |

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
