<?php
/**
 * REST API routes.
 *
 * Editor routes (listing backends, installations, devices and functions) require
 * the edit_posts capability. The public /data route only serves values for
 * backend/installation/function combinations that carry a valid signature,
 * which the block renderer adds to published blocks.
 *
 * @package IotOpenLynx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Permission callback for editor routes.
 *
 * @return bool
 */
function iot_open_lynx_can_edit() {
	return current_user_can( 'edit_posts' );
}

/**
 * Converts a list of Lynx objects to [{id, name}] sorted by name.
 *
 * @param array|WP_Error $items List.
 * @return array|WP_Error
 */
function iot_open_lynx_id_name_list( $items ) {
	if ( is_wp_error( $items ) ) {
		$items->add_data( array( 'status' => 502 ) );
		return $items;
	}
	$out = array();
	foreach ( $items as $item ) {
		if ( ! isset( $item->id ) ) {
			continue;
		}
		$out[] = array(
			'id'   => (int) $item->id,
			'name' => iot_open_lynx_display_name( $item ),
		);
	}
	usort(
		$out,
		static function ( $a, $b ) {
			return strnatcasecmp( $a['name'], $b['name'] );
		}
	);
	return $out;
}

add_action(
	'rest_api_init',
	static function () {
		$ns = 'iot-open-lynx/v1';

		$backend_arg = array(
			'type'     => 'string',
			'required' => true,
		);
		$id_arg      = array(
			'type'     => 'integer',
			'required' => true,
			'minimum'  => 1,
		);

		/**
		 * Resolves the client for a request, or an error response.
		 *
		 * @param WP_REST_Request $request Request.
		 * @return IoT_Open_Lynx_Client|WP_Error
		 */
		$client_for = static function ( WP_REST_Request $request ) {
			$client = IoT_Open_Lynx_Client::for_backend( $request['backend'] );
			return $client ? $client : new WP_Error( 'iot_open_lynx_unknown_backend', __( 'Unknown backend.', 'iot-open-lynx' ), array( 'status' => 404 ) );
		};

		register_rest_route(
			$ns,
			'/backends',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'iot_open_lynx_can_edit',
				'callback'            => static function () {
					return array_map(
						static function ( $backend ) {
							return array(
								'id'       => $backend['id'],
								'name'     => $backend['name'],
								'base_uri' => untrailingslashit( $backend['base_uri'] ),
							);
						},
						iot_open_lynx_get_backends()
					);
				},
			)
		);

		register_rest_route(
			$ns,
			'/installations',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'iot_open_lynx_can_edit',
				'args'                => array( 'backend' => $backend_arg ),
				'callback'            => static function ( WP_REST_Request $request ) use ( $client_for ) {
					$client = $client_for( $request );
					return is_wp_error( $client ) ? $client : iot_open_lynx_id_name_list( $client->installations() );
				},
			)
		);

		register_rest_route(
			$ns,
			'/devices',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'iot_open_lynx_can_edit',
				'args'                => array(
					'backend'      => $backend_arg,
					'installation' => $id_arg,
				),
				'callback'            => static function ( WP_REST_Request $request ) use ( $client_for ) {
					$client = $client_for( $request );
					return is_wp_error( $client ) ? $client : iot_open_lynx_id_name_list( $client->devices( $request['installation'] ) );
				},
			)
		);

		register_rest_route(
			$ns,
			'/functions',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'iot_open_lynx_can_edit',
				'args'                => array(
					'backend'      => $backend_arg,
					'installation' => $id_arg,
					'device'       => array(
						'type'    => 'integer',
						'default' => 0,
						'minimum' => 0,
					),
				),
				'callback'            => static function ( WP_REST_Request $request ) use ( $client_for ) {
					$client = $client_for( $request );
					if ( is_wp_error( $client ) ) {
						return $client;
					}
					$functions = $client->functions( $request['installation'] );
					$device    = (int) $request['device'];
					if ( $device && ! is_wp_error( $functions ) ) {
						$functions = array_filter(
							$functions,
							static function ( $f ) use ( $device ) {
								return isset( $f->meta->device_id ) && (int) $f->meta->device_id === $device;
							}
						);
					}
					return iot_open_lynx_id_name_list( $functions );
				},
			)
		);

		register_rest_route(
			$ns,
			'/data',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'args'                => array(
					'backend'      => $backend_arg,
					'installation' => $id_arg,
					'function'     => $id_arg,
					'token'        => array(
						'type'    => 'string',
						'default' => '',
					),
				),
				'permission_callback' => static function ( WP_REST_Request $request ) {
					if ( current_user_can( 'edit_posts' ) ) {
						return true;
					}
					$expected = iot_open_lynx_sign( $request['backend'], $request['installation'], $request['function'] );
					return hash_equals( $expected, (string) $request['token'] );
				},
				'callback'            => static function ( WP_REST_Request $request ) {
					$value = iot_open_lynx_get_value( $request['backend'], $request['installation'], $request['function'] );
					if ( is_wp_error( $value ) && ! $value->get_error_data() ) {
						$value->add_data( array( 'status' => 502 ) );
					}
					return $value;
				},
			)
		);

		register_rest_route(
			$ns,
			'/test-backend',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'base_uri' => array(
						'type'     => 'string',
						'format'   => 'uri',
						'required' => true,
					),
					'api_key'  => array(
						'type'    => 'string',
						'default' => '',
					),
				),
				'callback'            => static function ( WP_REST_Request $request ) {
					$client = new IoT_Open_Lynx_Client(
						array(
							'id'       => 'test',
							'base_uri' => esc_url_raw( $request['base_uri'] ),
							'api_key'  => (string) $request['api_key'],
						),
						false
					);
					$result = $client->installations();
					if ( is_wp_error( $result ) ) {
						return new WP_Error( 'iot_open_lynx_test_failed', $result->get_error_message(), array( 'status' => 400 ) );
					}
					return array( 'installations' => count( $result ) );
				},
			)
		);
	}
);
