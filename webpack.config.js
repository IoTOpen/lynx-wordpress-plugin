/**
 * Extends the default @wordpress/scripts config with the settings page and
 * inline value entries.
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
			inline: path.resolve( __dirname, 'src/inline/index.js' ),
			'inline-view': path.resolve( __dirname, 'src/inline/view.js' ),
			'inline-content': path.resolve(
				__dirname,
				'src/inline/content.scss'
			),
		};
	},
};
