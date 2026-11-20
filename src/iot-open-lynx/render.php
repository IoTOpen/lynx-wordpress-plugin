<?php
/**
 * Server-side render of the IoT Open Lynx block.
 *
 * @package IotOpenLynx
 *
 * @var array $attributes Block attributes.
 */

defined( 'ABSPATH' ) || exit;

echo iot_open_lynx_render_block( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the renderer.
