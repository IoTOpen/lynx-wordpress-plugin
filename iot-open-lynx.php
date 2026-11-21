<?php
/**
 * Plugin Name:       IoT Open Lynx
 * Plugin URI:        https://github.com/IoTOpen/lynx-wordpress-plugin
 * Description:       Show live values from IoT Open Lynx in the block editor.
 * Version:           0.3.6
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            IoT Open AB
 * Author URI:        https://iotopen.se
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       iot-open-lynx
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

define( 'IOT_OPEN_LYNX_FILE', __FILE__ );
define( 'IOT_OPEN_LYNX_DIR', plugin_dir_path( __FILE__ ) );
define( 'IOT_OPEN_LYNX_URL', plugin_dir_url( __FILE__ ) );

require_once IOT_OPEN_LYNX_DIR . 'includes/class-iot-open-lynx-client.php';
require_once IOT_OPEN_LYNX_DIR . 'includes/data.php';
require_once IOT_OPEN_LYNX_DIR . 'includes/settings.php';
require_once IOT_OPEN_LYNX_DIR . 'includes/rest.php';
require_once IOT_OPEN_LYNX_DIR . 'includes/block.php';
require_once IOT_OPEN_LYNX_DIR . 'includes/inline.php';
