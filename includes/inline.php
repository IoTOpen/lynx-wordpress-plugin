<?php
/**
 * Inline values: live Lynx values inside running text.
 *
 * The editor stores a span with the source in data attributes (see
 * src/inline/index.js). When a block is rendered, the span's text is replaced
 * with the current value and a signature is added, so inline-view.js can keep
 * it up to date through the public /data route.
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers a script or style built by wp-scripts.
 *
 * @param string $handle Handle.
 * @param string $name   Entry name in build/.
 * @param string $type   'script' or 'style'.
 * @return bool Whether the asset exists.
 */
function iot_open_lynx_register_asset( $handle, $name, $type ) {
	$asset_file = IOT_OPEN_LYNX_DIR . 'build/' . $name . '.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return false;
	}
	$asset = require $asset_file;
	if ( 'style' === $type ) {
		wp_register_style( $handle, IOT_OPEN_LYNX_URL . 'build/' . $name . '.css', array(), $asset['version'] );
	} else {
		wp_register_script(
			$handle,
			IOT_OPEN_LYNX_URL . 'build/' . $name . '.js',
			$asset['dependencies'],
			$asset['version'],
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
	}
	return true;
}

add_action(
	'init',
	static function () {
		if ( iot_open_lynx_register_asset( 'iot-open-lynx-inline-view', 'inline-view', 'script' ) ) {
			wp_add_inline_script(
				'iot-open-lynx-inline-view',
				'window.iotOpenLynxInline=' . wp_json_encode( array( 'endpoint' => rest_url( 'iot-open-lynx/v1/data' ) ) ) . ';',
				'before'
			);
		}
	}
);

// Toolbar button and popover in the editor.
add_action(
	'enqueue_block_editor_assets',
	static function () {
		if ( iot_open_lynx_register_asset( 'iot-open-lynx-inline', 'inline', 'script' ) ) {
			wp_enqueue_script( 'iot-open-lynx-inline' );
			wp_set_script_translations( 'iot-open-lynx-inline', 'iot-open-lynx' );
			if ( file_exists( IOT_OPEN_LYNX_DIR . 'build/inline.css' ) ) {
				wp_enqueue_style( 'iot-open-lynx-inline', IOT_OPEN_LYNX_URL . 'build/inline.css', array( 'wp-components' ), filemtime( IOT_OPEN_LYNX_DIR . 'build/inline.css' ) );
			}
		}
	}
);

// Marks inline values in the editor canvas (which may be an iframe).
add_action(
	'enqueue_block_assets',
	static function () {
		if ( is_admin() && iot_open_lynx_register_asset( 'iot-open-lynx-inline-content', 'inline-content', 'style' ) ) {
			wp_enqueue_style( 'iot-open-lynx-inline-content' );
		}
	}
);

/**
 * Fields that an inline value can show.
 *
 * @return string[]
 */
function iot_open_lynx_inline_fields() {
	return array( 'formatted', 'function_name', 'device_name', 'installation_name', 'updated' );
}

/**
 * Replaces one inline value span with the current value.
 *
 * @param array $matches 1: attributes of the opening tag, 2: inner HTML.
 * @return string
 */
function iot_open_lynx_render_inline_match( $matches ) {
	$tags = new WP_HTML_Tag_Processor( '<span' . $matches[1] . '>' );
	if ( ! $tags->next_tag( 'span' ) || null !== $tags->get_attribute( 'data-lynx-token' ) ) {
		// Already rendered (nested blocks are filtered more than once).
		return $matches[0];
	}

	$backend_id      = (string) $tags->get_attribute( 'data-lynx-backend' );
	$installation_id = absint( $tags->get_attribute( 'data-lynx-installation' ) );
	$function_id     = absint( $tags->get_attribute( 'data-lynx-function' ) );
	$field           = (string) $tags->get_attribute( 'data-lynx-field' );
	if ( ! in_array( $field, iot_open_lynx_inline_fields(), true ) ) {
		$field = 'formatted';
	}
	if ( '' === $backend_id || ! $installation_id || ! $function_id ) {
		return $matches[0];
	}

	$data = iot_open_lynx_get_value( $backend_id, $installation_id, $function_id );
	if ( is_wp_error( $data ) ) {
		// Keep the snapshot from the editor, but let the browser retry.
		$tags->add_class( 'is-error' );
		$text = $matches[2];
	} else {
		$value = isset( $data[ $field ] ) ? (string) $data[ $field ] : '';
		$text  = esc_html( '' !== $value ? $value : '–' );
	}

	// Not part of the format; drop it should it ever end up in saved content.
	$tags->remove_attribute( 'data-lynx-live' );
	$tags->set_attribute( 'data-lynx-token', iot_open_lynx_sign( $backend_id, $installation_id, $function_id ) );

	wp_enqueue_script( 'iot-open-lynx-inline-view' );

	return $tags->get_updated_html() . $text . '</span>';
}

/**
 * Renders all inline values in a piece of HTML.
 *
 * @param string $html HTML.
 * @return string
 */
function iot_open_lynx_render_inline( $html ) {
	if ( ! is_string( $html ) || false === strpos( $html, 'iot-open-lynx-inline' ) ) {
		return $html;
	}
	$result = preg_replace_callback(
		'#<span\b([^>]*\bclass="[^"]*\biot-open-lynx-inline\b[^"]*"[^>]*)>(.*?)</span>#s',
		'iot_open_lynx_render_inline_match',
		$html
	);
	return null === $result ? $html : $result;
}

add_filter(
	'render_block',
	static function ( $block_content ) {
		return is_admin() ? $block_content : iot_open_lynx_render_inline( $block_content );
	}
);
