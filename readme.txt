=== IoT Open Lynx ===
Contributors:      iotopen, rejas
Tags:              iot, sensor, block, live data, dashboard
Requires at least: 6.7
Tested up to:      7.1
Requires PHP:      7.4
Stable tag:        0.3.6
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Show live values from IoT Open Lynx in the block editor.

== Description ==

Adds an "IoT Open Lynx value" block that shows the latest value of a function in
IoT Open Lynx, for example a temperature, a water level or the state of a door.

* Choose installation, device and function from drop-downs.
* Rendered on the server and refreshed in the browser at a configurable interval.
* Formatting follows the function settings in Lynx.
* Colors, font sizes and which fields to show are configurable per block.
* Inline values: put a live value inside running text with the "Lynx value" button in the rich text toolbar.
* The API key stays on the server. Visitors can only read the values that are published in blocks.

Source code, issue tracker and build instructions: https://github.com/IoTOpen/lynx-wordpress-plugin
The JavaScript in `build/` is compiled from `src/` (included in the plugin) with `npm run build`.

== External services ==

This plugin connects to IoT Open Lynx, an IoT platform operated by IoT Open AB, to read
the values it shows. It does nothing until an administrator has added a backend under
Settings → IoT Open Lynx.

The plugin only talks to the base URI configured for each backend (by default
https://lynx.iotopen.se). All requests are made by the WordPress server; visitors'
browsers only talk to your own site.

What is sent, and when:

* When an editor picks installation, device and function in the block editor: the API key
  and the ids of the selected installation and device.
* When a page with a block or an inline value is rendered, and when the browser refreshes a
  value: the API key and the ids of the installation, device and function that are shown.
  Responses are cached on the server (values for 10 seconds, names for 5 minutes).
* When an administrator uses "Test connection" on the settings page: the entered API key.

No information about visitors (such as IP addresses or cookies) is sent to Lynx.

IoT Open AB privacy policy: https://iotopen.io/en/privacy-policy/

== Installation ==

1. Upload the plugin and activate it.
2. Go to Settings → IoT Open Lynx and add a backend (base URI and API key, or leave the key empty for the public API).
3. Add the "IoT Open Lynx value" block to a post or page, or use the "Lynx value" button in the paragraph toolbar (under the ▾ menu) to put a value inside text.

== Frequently Asked Questions ==

= Which API key should I use? =

Create a dedicated Lynx user with read access to the installations you want to show, and create an API key for that user.

= Can I change the name that is shown? =

Yes. Add a `wp_name` metadata field to the function or device in Lynx.

== Screenshots ==

1. Live values on a page: three blocks and values inside running text.
2. The block in the editor. Pick backend, installation, device and function, and choose what to show.
3. Putting a live value inside a paragraph with the "Lynx value" button.

== Changelog ==

= 0.3.6 =
* Screenshots for the plugin directory.

= 0.3.5 =
* Banner and icon for the plugin directory.

= 0.3.4 =
* Readme: add the iotopen account to contributors.

= 0.3.3 =
* Readme: set contributors.

= 0.3.2 =
* Readme: link to the IoT Open privacy policy.

= 0.3.1 =
* Prepared for WordPress.org: External services section in the readme, source code included in the plugin.
* Follows the WordPress coding standards.

= 0.3.0 =
* New: inline values. A rich text format that shows a live value, name or update time inside running text.
* The editor shows the current value of inline values, without marking the post as changed.

= 0.2.0 =
* Security: editor REST routes require the edit_posts capability; public value requests must carry a per-block signature.
* Security: ids are validated as integers before being used in Lynx API paths.
* Dynamic block rendered on the server; the front end no longer loads React.
* API responses are cached, with timeouts and error handling.
* Fixed custom value and background colors not being applied on the front end.
* Fixed "center" alignment for the last updated text.
* Fixed automatic selection when only one backend is configured, and links to Lynx in the editor.
* New: show installation name, test connection on the settings page.
* All texts translatable and in English.

= 0.1.0 =
* First version.
