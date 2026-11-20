<?php
/**
 * Settings: the list of Lynx backends and the admin page that edits it.
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sanitizes the backend list.
 *
 * @param mixed $value Raw value.
 * @return array[]
 */
function iot_open_lynx_sanitize_backends( $value ) {
	if ( ! is_array( $value ) ) {
		return array();
	}
	$out = array();
	foreach ( $value as $backend ) {
		if ( ! is_array( $backend ) ) {
			continue;
		}
		$base_uri = untrailingslashit( esc_url_raw( trim( (string) ( $backend['base_uri'] ?? '' ) ), array( 'http', 'https' ) ) );
		if ( '' === $base_uri ) {
			continue;
		}
		$id    = sanitize_text_field( (string) ( $backend['id'] ?? '' ) );
		$out[] = array(
			'id'       => '' !== $id ? $id : wp_generate_uuid4(),
			'name'     => sanitize_text_field( (string) ( $backend['name'] ?? '' ) ),
			'base_uri' => $base_uri,
			'api_key'  => trim( sanitize_text_field( (string) ( $backend['api_key'] ?? '' ) ) ),
		);
	}
	return $out;
}

add_action(
	'init',
	static function () {
		register_setting(
			'iot_open_lynx',
			'iot_open_lynx_backends',
			array(
				'type'              => 'array',
				'default'           => array(),
				'sanitize_callback' => 'iot_open_lynx_sanitize_backends',
				// Exposed through /wp/v2/settings, which requires manage_options.
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type'       => 'object',
							'properties' => array(
								'id'       => array( 'type' => 'string' ),
								'name'     => array( 'type' => 'string' ),
								'base_uri' => array( 'type' => 'string' ),
								'api_key'  => array( 'type' => 'string' ),
							),
						),
					),
				),
			)
		);
	}
);

add_action(
	'admin_menu',
	static function () {
		add_options_page(
			__( 'IoT Open Lynx', 'iot-open-lynx' ),
			__( 'IoT Open Lynx', 'iot-open-lynx' ),
			'manage_options',
			'iot-open-lynx',
			static function () {
				echo '<div class="wrap"><h1>' . esc_html__( 'IoT Open Lynx', 'iot-open-lynx' ) . '</h1>';
				echo '<div id="iot-open-lynx-settings"></div></div>';
			}
		);
	}
);

add_action(
	'admin_enqueue_scripts',
	static function ( $hook ) {
		if ( 'settings_page_iot-open-lynx' !== $hook ) {
			return;
		}
		$asset_file = IOT_OPEN_LYNX_DIR . 'build/settings.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;
		wp_enqueue_script(
			'iot-open-lynx-settings',
			IOT_OPEN_LYNX_URL . 'build/settings.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_set_script_translations( 'iot-open-lynx-settings', 'iot-open-lynx' );
		wp_enqueue_style( 'wp-components' );
		wp_add_inline_style(
			'wp-components',
			'.iot-open-lynx-snackbars{position:fixed;top:auto;bottom:24px;left:calc(var(--wp-admin--admin-menu--width,160px) + 24px);z-index:100000}'
		);
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( IOT_OPEN_LYNX_FILE ),
	static function ( $links ) {
		array_unshift(
			$links,
			sprintf(
				'<a href="%s">%s</a>',
				esc_url( admin_url( 'options-general.php?page=iot-open-lynx' ) ),
				esc_html__( 'Settings', 'iot-open-lynx' )
			)
		);
		return $links;
	}
);
