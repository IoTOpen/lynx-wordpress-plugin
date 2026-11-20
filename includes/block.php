<?php
/**
 * Block registration and server-side rendering.
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function () {
		register_block_type( IOT_OPEN_LYNX_DIR . 'build/iot-open-lynx' );
	}
);

/**
 * Builds an inline style attribute from a property => value map, skipping empty values.
 *
 * @param array $props CSS properties.
 * @return string
 */
function iot_open_lynx_style( array $props ) {
	$css = '';
	foreach ( $props as $prop => $value ) {
		if ( '' !== (string) $value ) {
			$css .= $prop . ':' . $value . ';';
		}
	}
	return '' !== $css ? ' style="' . esc_attr( safecss_filter_attr( $css ) ) . '"' : '';
}

/**
 * Sanitizes a color attribute value.
 *
 * @param mixed $color Color.
 * @return string
 */
function iot_open_lynx_color( $color ) {
	$color = (string) $color;
	if ( preg_match( '/^#[0-9a-f]{3,8}$/i', $color ) || preg_match( '/^(rgb|hsl)a?\([0-9.,%\s\/]+\)$/i', $color ) ) {
		return $color;
	}
	return '';
}

/**
 * Renders the block.
 *
 * @param array $attributes Block attributes.
 * @return string
 */
function iot_open_lynx_render_block( array $attributes ) {
	$backend_id      = (string) ( $attributes['lynxId'] ?? '' );
	$installation_id = absint( $attributes['installationId'] ?? 0 );
	$function_id     = absint( $attributes['functionId'] ?? 0 );

	if ( '' === $backend_id || ! $installation_id || ! $function_id ) {
		return '';
	}

	$show = wp_parse_args(
		(array) ( $attributes['showValues'] ?? array() ),
		array(
			'value'            => true,
			'functionName'     => true,
			'deviceName'       => false,
			'installationName' => false,
			'lastUpdated'      => false,
			'countdown'        => false,
		)
	);
	// Values may arrive as strings ("false") from query-string based previews.
	$show     = array_map( 'rest_sanitize_boolean', $show );
	$refresh  = max( 10, min( 3600, (int) ( $attributes['refreshInterval'] ?? 60 ) ) );
	$position = (string) ( $attributes['lastUpdatedPosition'] ?? 'right' );
	$position = in_array( $position, array( 'left', 'right', 'center' ), true ) ? $position : ( 'middle' === $position ? 'center' : 'right' );

	$text_color  = iot_open_lynx_color( $attributes['textColor'] ?? '' );
	$value_color = iot_open_lynx_color( $attributes['valueColor'] ?? '' );
	$background  = iot_open_lynx_color( $attributes['backgroundColor'] ?? '' );
	$size        = static function ( $key, $fallback ) use ( $attributes ) {
		$px = (int) ( $attributes[ $key ] ?? $fallback );
		return ( $px > 0 ? $px : $fallback ) . 'px';
	};

	$data  = iot_open_lynx_get_value( $backend_id, $installation_id, $function_id );
	$error = is_wp_error( $data );
	if ( $error ) {
		$data = array();
	}

	$config = array(
		'endpoint'     => rest_url( 'iot-open-lynx/v1/data' ),
		'backend'      => $backend_id,
		'installation' => $installation_id,
		'function'     => $function_id,
		'token'        => iot_open_lynx_sign( $backend_id, $installation_id, $function_id ),
		'refresh'      => $refresh,
	);

	$wrapper = get_block_wrapper_attributes(
		array(
			'class'       => 'iot-open-lynx' . ( $error ? ' is-error' : '' ),
			'data-config' => wp_json_encode( $config ),
		)
	);

	$text_style    = array( 'color' => $text_color );
	$value_style   = array(
		'color'     => $value_color,
		'font-size' => $size( 'valueFontSize', 48 ),
	);
	$updated_style = $text_style + array(
		'font-size'  => $size( 'lastUpdatedFontSize', 10 ),
		'text-align' => $position,
	);

	ob_start();
	?>
	<div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
		<div class="iot-block-content"<?php echo iot_open_lynx_style( array( 'background-color' => $background ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php if ( $show['installationName'] ) : ?>
				<p class="iot-block-installationName" data-field="installation_name"<?php echo iot_open_lynx_style( $text_style + array( 'font-size' => $size( 'deviceFontSize', 14 ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( $data['installation_name'] ?? '' ); ?></p>
			<?php endif; ?>
			<?php if ( $show['deviceName'] ) : ?>
				<p class="iot-block-deviceName" data-field="device_name"<?php echo iot_open_lynx_style( $text_style + array( 'font-size' => $size( 'deviceFontSize', 14 ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( $data['device_name'] ?? '' ); ?></p>
			<?php endif; ?>
			<?php if ( $show['value'] ) : ?>
				<p class="iot-block-value" data-field="formatted" aria-live="polite"<?php echo iot_open_lynx_style( $value_style ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( ( $data['formatted'] ?? '' ) !== '' ? $data['formatted'] : '–' ); ?></p>
			<?php endif; ?>
			<?php if ( $show['functionName'] ) : ?>
				<p class="iot-block-functionName" data-field="function_name"<?php echo iot_open_lynx_style( $text_style + array( 'font-size' => $size( 'functionFontSize', 14 ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( $data['function_name'] ?? '' ); ?></p>
			<?php endif; ?>
			<?php if ( $show['lastUpdated'] ) : ?>
				<p class="iot-block-lastUpdated" data-field="updated"<?php echo iot_open_lynx_style( $updated_style ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( $data['updated'] ?? '' ); ?></p>
			<?php endif; ?>
			<?php if ( $show['countdown'] ) : ?>
				<div class="iot-block-progress-wrapper" aria-hidden="true"><div class="iot-block-progress"<?php echo iot_open_lynx_style( array( 'background-color' => $value_color ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>></div></div>
			<?php endif; ?>
		</div>
	</div>
	<?php
	return (string) ob_get_clean();
}
