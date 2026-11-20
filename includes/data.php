<?php
/**
 * Backend configuration, value lookup and formatting.
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Returns all configured backends.
 *
 * @return array[]
 */
function iot_open_lynx_get_backends() {
	$backends = get_option( 'iot_open_lynx_backends', array() );
	return is_array( $backends ) ? array_values( array_filter( $backends, 'is_array' ) ) : array();
}

/**
 * Returns one configured backend by id.
 *
 * @param string $backend_id Backend id.
 * @return array|null
 */
function iot_open_lynx_get_backend( $backend_id ) {
	foreach ( iot_open_lynx_get_backends() as $backend ) {
		if ( isset( $backend['id'] ) && (string) $backend['id'] === (string) $backend_id ) {
			return $backend;
		}
	}
	return null;
}

/**
 * Signs a backend/installation/function combination so that anonymous visitors
 * can read exactly the values that are published in blocks, and nothing else.
 *
 * @param string $backend_id      Backend id.
 * @param int    $installation_id Installation id.
 * @param int    $function_id     Function id.
 * @return string
 */
function iot_open_lynx_sign( $backend_id, $installation_id, $function_id ) {
	return hash_hmac( 'sha256', 'iot-open-lynx|' . $backend_id . '|' . absint( $installation_id ) . '|' . absint( $function_id ), wp_salt( 'auth' ) );
}

/**
 * Picks the display name of a Lynx object; meta.wp_name overrides meta.name.
 *
 * @param object|null $item Lynx object with meta.
 * @return string
 */
function iot_open_lynx_display_name( $item ) {
	if ( ! $item ) {
		return '';
	}
	if ( ! empty( $item->meta->wp_name ) ) {
		return (string) $item->meta->wp_name;
	}
	if ( ! empty( $item->meta->name ) ) {
		return (string) $item->meta->name;
	}
	return isset( $item->name ) ? (string) $item->name : '';
}

/**
 * Fetches the latest value of a function, including names for display.
 *
 * @param string $backend_id      Backend id.
 * @param int    $installation_id Installation id.
 * @param int    $function_id     Function id.
 * @return array|WP_Error
 */
function iot_open_lynx_get_value( $backend_id, $installation_id, $function_id ) {
	$client = IoT_Open_Lynx_Client::for_backend( $backend_id );
	if ( ! $client ) {
		return new WP_Error( 'iot_open_lynx_unknown_backend', __( 'Unknown backend.', 'iot-open-lynx' ), array( 'status' => 404 ) );
	}

	$function = $client->function_object( $installation_id, $function_id );
	if ( ! $function ) {
		return new WP_Error( 'iot_open_lynx_unknown_function', __( 'Function not found.', 'iot-open-lynx' ), array( 'status' => 404 ) );
	}

	$device = null;
	if ( ! empty( $function->meta->device_id ) ) {
		$device = $client->device( $installation_id, $function->meta->device_id );
	}

	$result = array(
		'value'             => null,
		'formatted'         => '',
		'timestamp'         => null,
		'updated'           => '',
		'function_name'     => iot_open_lynx_display_name( $function ),
		'device_name'       => iot_open_lynx_display_name( $device ),
		'installation_name' => iot_open_lynx_display_name( $client->installation( $installation_id ) ),
	);

	if ( empty( $function->meta->topic_read ) ) {
		return $result;
	}

	$status = $client->status( $installation_id, $function->meta->topic_read );
	if ( is_wp_error( $status ) ) {
		return $status;
	}
	if ( $status && isset( $status->value ) ) {
		$result['value']     = $status->value;
		$result['formatted'] = iot_open_lynx_format_value( $function, $status->value );
		$result['timestamp'] = isset( $status->timestamp ) ? (float) $status->timestamp : null;
		$result['updated']   = $result['timestamp']
			? wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), (int) $result['timestamp'] )
			: '';
	}

	return $result;
}

/**
 * Formats a raw value according to the function type and meta.format.
 *
 * @param object $lynx_function Lynx function object.
 * @param mixed  $value         Raw value.
 * @return string
 */
function iot_open_lynx_format_value( $lynx_function, $value ) {
	if ( null === $value ) {
		return '';
	}
	if ( ! is_numeric( $value ) ) {
		return (string) $value;
	}

	$meta  = isset( $lynx_function->meta ) ? $lynx_function->meta : new stdClass();
	$state = static function ( $key ) use ( $meta ) {
		return isset( $meta->$key ) && is_numeric( $meta->$key ) ? (float) $meta->$key : null;
	};
	$text  = static function ( $key, $fallback ) use ( $meta ) {
		return isset( $meta->$key ) && '' !== $meta->$key ? (string) $meta->$key : $fallback;
	};
	$v     = (float) $value;

	switch ( $lynx_function->type ?? '' ) {
		case 'movement':
			if ( $state( 'state_movement' ) === $v ) {
				return $text( 'text_movement', __( 'Movement', 'iot-open-lynx' ) );
			}
			if ( $state( 'state_nomovement' ) === $v ) {
				return $text( 'text_nomovement', __( 'No movement', 'iot-open-lynx' ) );
			}
			break;
		case 'boolean_text':
			if ( $state( 'state_true' ) === $v ) {
				return $text( 'text_true', __( 'True', 'iot-open-lynx' ) );
			}
			if ( $state( 'state_false' ) === $v ) {
				return $text( 'text_false', __( 'False', 'iot-open-lynx' ) );
			}
			break;
		case 'switch':
		case 'sensor_binary':
			if ( $state( 'state_on' ) === $v ) {
				return __( 'On', 'iot-open-lynx' );
			}
			if ( $state( 'state_off' ) === $v ) {
				return __( 'Off', 'iot-open-lynx' );
			}
			break;
		case 'door':
			if ( $state( 'state_open' ) === $v ) {
				return __( 'Open', 'iot-open-lynx' );
			}
			if ( $state( 'state_closed' ) === $v ) {
				return __( 'Closed', 'iot-open-lynx' );
			}
			break;
		default:
			if ( ! empty( $meta->format ) && is_string( $meta->format ) ) {
				try {
					return sprintf( $meta->format, $value );
				} catch ( \Throwable $e ) {
					// Malformed format string in Lynx meta; fall through to the raw value.
					return (string) $value;
				}
			}
	}

	return (string) $value;
}
