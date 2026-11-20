<?php
/**
 * Minimal IoT Open Lynx REST API client built on the WordPress HTTP API.
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Talks to one configured Lynx backend.
 */
class IoT_Open_Lynx_Client {

	/**
	 * How long metadata (installations, devices, functions) is cached.
	 */
	const META_TTL = 300;

	/**
	 * How long a read value is cached. Shared by all visitors.
	 */
	const VALUE_TTL = 10;

	/**
	 * How long a failed request is cached, so a dead backend does not slow down every page view.
	 */
	const ERROR_TTL = 30;

	/**
	 * Backend configuration: id, name, base_uri, api_key.
	 *
	 * @var array
	 */
	private $backend;

	/**
	 * Whether responses are cached in transients.
	 *
	 * @var bool
	 */
	private $use_cache;

	/**
	 * Constructor.
	 *
	 * @param array $backend   Backend configuration.
	 * @param bool  $use_cache Cache responses in transients.
	 */
	public function __construct( array $backend, $use_cache = true ) {
		$this->backend   = $backend;
		$this->use_cache = $use_cache;
	}

	/**
	 * Returns the client for a configured backend id, or null.
	 *
	 * @param string $backend_id Backend id.
	 * @return IoT_Open_Lynx_Client|null
	 */
	public static function for_backend( $backend_id ) {
		$backend = iot_open_lynx_get_backend( $backend_id );
		return $backend ? new self( $backend ) : null;
	}

	/**
	 * Whether this backend uses the public (unauthenticated) API.
	 *
	 * @return bool
	 */
	public function is_public() {
		return '' === (string) ( $this->backend['api_key'] ?? '' );
	}

	/**
	 * Performs a cached GET request against the Lynx API.
	 *
	 * @param string $path  API path, e.g. "/api/v2/functionx/12".
	 * @param array  $query Query parameters.
	 * @param int    $ttl   Cache lifetime in seconds, 0 to bypass the cache.
	 * @return mixed|WP_Error Decoded JSON.
	 */
	public function get( $path, array $query = array(), $ttl = self::META_TTL ) {
		if ( ! $this->use_cache ) {
			$ttl = 0;
		}

		$url = untrailingslashit( $this->backend['base_uri'] ) . $path;
		if ( $query ) {
			$url = add_query_arg( array_map( 'rawurlencode', $query ), $url );
		}

		$cache_key = 'iot_open_lynx_' . md5( $url . '|' . ( $this->backend['api_key'] ?? '' ) );
		if ( $ttl > 0 ) {
			$cached = get_transient( $cache_key );
			if ( is_array( $cached ) && array_key_exists( 'body', $cached ) ) {
				return $cached['body'];
			}
			if ( is_array( $cached ) && isset( $cached['error'] ) ) {
				return new WP_Error( 'iot_open_lynx_backend', $cached['error'] );
			}
		}

		$args = array(
			'timeout' => 5,
			'headers' => array( 'Accept' => 'application/json' ),
		);
		if ( ! $this->is_public() ) {
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- HTTP Basic auth.
			$args['headers']['Authorization'] = 'Basic ' . base64_encode( 'token:' . $this->backend['api_key'] );
		}

		$response = wp_remote_get( $url, $args );
		$result   = $this->parse_response( $response );

		if ( $ttl > 0 ) {
			if ( is_wp_error( $result ) ) {
				set_transient( $cache_key, array( 'error' => $result->get_error_message() ), min( $ttl, self::ERROR_TTL ) );
			} else {
				set_transient( $cache_key, array( 'body' => $result ), $ttl );
			}
		}

		return $result;
	}

	/**
	 * Turns an HTTP response into decoded JSON or an error.
	 *
	 * @param array|WP_Error $response Response from wp_remote_get().
	 * @return mixed|WP_Error
	 */
	private function parse_response( $response ) {
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'iot_open_lynx_backend', $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ) );

		if ( $code < 200 || $code >= 300 ) {
			$message = is_object( $body ) && isset( $body->message ) ? $body->message : 'HTTP ' . $code;
			return new WP_Error( 'iot_open_lynx_backend', $message, array( 'status' => $code ) );
		}
		if ( null === $body ) {
			return new WP_Error( 'iot_open_lynx_backend', 'Invalid JSON from backend' );
		}

		return $body;
	}

	/**
	 * Lists installations available to the API key.
	 *
	 * @return array|WP_Error
	 */
	public function installations() {
		if ( $this->is_public() ) {
			return $this->as_list( $this->get( '/api/v2/installation' ) );
		}
		return $this->as_list( $this->get( '/api/v2/installationinfo', array( 'assigned' => 'true' ) ) );
	}

	/**
	 * Lists devices in an installation.
	 *
	 * @param int $installation_id Installation id.
	 * @return array|WP_Error
	 */
	public function devices( $installation_id ) {
		return $this->as_list( $this->get( '/api/v2/devicex/' . absint( $installation_id ) ) );
	}

	/**
	 * Lists functions in an installation.
	 *
	 * @param int $installation_id Installation id.
	 * @return array|WP_Error
	 */
	public function functions( $installation_id ) {
		return $this->as_list( $this->get( '/api/v2/functionx/' . absint( $installation_id ) ) );
	}

	/**
	 * Finds one installation in the (cached) installation list.
	 *
	 * @param int $installation_id Installation id.
	 * @return object|null
	 */
	public function installation( $installation_id ) {
		return $this->find( $this->installations(), $installation_id );
	}

	/**
	 * Finds one device in the (cached) device list.
	 *
	 * @param int $installation_id Installation id.
	 * @param int $device_id       Device id.
	 * @return object|null
	 */
	public function device( $installation_id, $device_id ) {
		return $this->find( $this->devices( $installation_id ), $device_id );
	}

	/**
	 * Finds one function in the (cached) function list.
	 *
	 * @param int $installation_id Installation id.
	 * @param int $function_id     Function id.
	 * @return object|null
	 */
	public function function_object( $installation_id, $function_id ) {
		return $this->find( $this->functions( $installation_id ), $function_id );
	}

	/**
	 * Returns the latest status message for a topic.
	 *
	 * @param int    $installation_id Installation id.
	 * @param string $topic           Topic, as stored in function meta.
	 * @return object|null|WP_Error
	 */
	public function status( $installation_id, $topic ) {
		$result = $this->get(
			'/api/v2/status/' . absint( $installation_id ),
			array( 'topics' => $topic ),
			self::VALUE_TTL
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return is_array( $result ) && isset( $result[0] ) ? $result[0] : null;
	}

	/**
	 * Normalizes a list response.
	 *
	 * @param mixed $result API result.
	 * @return array|WP_Error
	 */
	private function as_list( $result ) {
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return is_array( $result ) ? $result : array();
	}

	/**
	 * Finds an object by id in a list.
	 *
	 * @param array|WP_Error $list List of objects.
	 * @param int            $id   Id.
	 * @return object|null
	 */
	private function find( $list, $id ) {
		if ( is_wp_error( $list ) ) {
			return null;
		}
		foreach ( $list as $item ) {
			if ( isset( $item->id ) && (int) $item->id === (int) $id ) {
				return $item;
			}
		}
		return null;
	}
}
