/**
 * Extends the default @wordpress/scripts config with the settings page entry.
 * Block entries (from block.json) are picked up automatically.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: async () => {
		const blocks =
			typeof defaultConfig.entry === 'function'
				? await defaultConfig.entry()
				: defaultConfig.entry;
		return {
			...blocks,
			settings: path.resolve( __dirname, 'src/settings.js' ),
		};
	},
};
