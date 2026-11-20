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
- **Inline values**: put a live value inside running text, e.g. "The battery is at
  **13.0 V** right now". Select the *Lynx value* button in the paragraph toolbar
  (under the ▾ menu). Works in any block with rich text: paragraphs, headings, lists,
  quotes, tables. Can show the value, the function, device or installation name, or
  when the value was last updated. The editor shows the current value too.

## Security model

The API key is stored in WordPress and never sent to the browser. Visitors only talk
to WordPress:

- The routes that list installations, devices and functions require a logged-in user
  who can edit posts.
- The public `/wp-json/iot-open-lynx/v1/data` route only answers for the exact
  backend/installation/function combinations that are published in a block or an
  inline value. Each one carries an HMAC signature created with the site's secret
  keys when the page is rendered; signatures are never stored in post content.
- Responses from Lynx are cached in transients (values 10 s, metadata 5 min), so a
  popular page does not turn into a flood of API calls.

Use an API key with the least access needed, preferably a dedicated read-only user.

## Installation

Download `iot-open-lynx.zip` from the [latest release](https://github.com/IoTOpen/lynx-wordpress-plugin/releases)
and upload it under **Plugins → Add New → Upload Plugin**. Then go to
**Settings → IoT Open Lynx**, add a backend and use **Test connection**.

Requires WordPress 6.7 and PHP 7.4 or later.

### How inline values are stored

An inline value is a `<span>` in the post content:

```html
<span class="iot-open-lynx-inline" data-lynx-backend="…" data-lynx-installation="78"
      data-lynx-device="0" data-lynx-function="18228" data-lynx-field="formatted">13.0196</span>
```

The text is a snapshot from when it was inserted. When the page is rendered, the
`render_block` filter replaces it with the current value and adds a signature, and
`build/inline-view.js` keeps it up to date (one request per function, every 60 s).
`data-lynx-field` is one of `formatted`, `function_name`, `device_name`,
`installation_name` or `updated`. If the plugin is deactivated, the snapshot text
remains.

In the editor the snapshot is not changed (that would mark the post as modified).
Instead `src/inline/live.js` adds a stylesheet to the editor canvas that hides the
snapshot and shows the current value with `::after`, refreshed every 60 s.

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
| `includes/class-iot-open-lynx-client.php` | Lynx API client (WordPress HTTP API + transient cache) |
| `includes/data.php` | Backend config, value lookup and formatting |
| `includes/rest.php` | REST routes used by the editor and the front end |
| `includes/block.php` | Block registration and server-side rendering |
| `includes/inline.php` | Inline values: asset registration and server-side rendering |
| `includes/settings.php` | Settings registration and admin page |
| `src/iot-open-lynx/` | The block: `block.json`, editor (`edit.js`), front-end updater (`view.js`), styles |
| `src/inline/` | Inline value rich text format (`index.js`) and its front-end updater (`view.js`) |
| `src/shared/` | Source picker used by both editors, and the polling code used by both front ends |
| `src/settings.js` | Settings page UI |

## Publishing to WordPress.org

Tagged releases (`v*`) are deployed to the WordPress.org plugin directory by the
`deploy-wordpress-org` job in `.github/workflows/ci.yml`, once the plugin has been
approved and the repository secrets `SVN_USERNAME` and `SVN_PASSWORD` are set.
Banner, icon and screenshots for the plugin page go in `.wordpress-org/`
(`banner-772x250.png`, `banner-1544x500.png`, `icon-128x128.png`, `icon-256x256.png`,
`screenshot-1.png`, …).

Before the first submission:

- [ ] Make this repository public (the readme links to it as the source code).
- [ ] Replace `TODO-TERMS-URL` and `TODO-PRIVACY-URL` in `readme.txt`.
- [ ] Set `Contributors` in `readme.txt` to the WordPress.org user name(s) of the
      account that submits the plugin.
- [ ] Test on the WordPress version in `Tested up to` and run the
      [Plugin Check](https://wordpress.org/plugins/plugin-check/) plugin.
- [ ] Build the zip (`npm ci && npm run build && npm run plugin-zip`) and upload it at
      https://wordpress.org/plugins/developers/add/.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
