/**
 * IoT Open Lynx value block.
 *
 * The block is dynamic: markup is rendered on the server (render.php) and
 * kept up to date in the browser by view.js.
 */
import { registerBlockType } from '@wordpress/blocks';

import './style.scss';
import './editor.scss';

import Edit from './edit';
import deprecated from './deprecated';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
	deprecated,
} );
