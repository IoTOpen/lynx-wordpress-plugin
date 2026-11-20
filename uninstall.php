<?php
/**
 * Removes plugin data on uninstall.
 *
 * @package IotOpenLynx
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'iot_open_lynx_backends' );

global $wpdb;
// Cached API responses.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_iot\\_open\\_lynx\\_%' OR option_name LIKE '\\_transient\\_timeout\\_iot\\_open\\_lynx\\_%'" );
