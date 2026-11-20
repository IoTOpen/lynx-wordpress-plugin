=== IoT Open Lynx ===
Contributors:      iotopen
Tags:              iot, sensor, block, live data, dashboard
Requires at least: 6.7
Tested up to:      6.8
Requires PHP:      7.4
Stable tag:        0.2.0
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
* The API key stays on the server. Visitors can only read the values that are published in blocks.

== Installation ==

1. Upload the plugin and activate it.
2. Go to Settings → IoT Open Lynx and add a backend (base URI and API key, or leave the key empty for the public API).
3. Add the "IoT Open Lynx value" block to a post or page.

== Frequently Asked Questions ==

= Which API key should I use? =

Create a dedicated Lynx user with read access to the installations you want to show, and create an API key for that user.

= Can I change the name that is shown? =

Yes. Add a `wp_name` metadata field to the function or device in Lynx.

== Changelog ==

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
