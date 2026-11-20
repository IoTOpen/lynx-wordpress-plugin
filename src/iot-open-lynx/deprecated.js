/**
 * Deprecations.
 *
 * v1 (0.1.x) saved an empty div carrying the configuration as data attributes
 * and rendered it with React on the front end. Blocks saved with v1 are
 * migrated to the dynamic block on the next edit; on the front end they are
 * rendered by render.php right away, since the saved markup is ignored.
 */
import { useBlockProps } from '@wordpress/block-editor';
import metadata from './block.json';

const v1 = {
	attributes: metadata.attributes,
	supports: { html: false },
	save( { attributes } ) {
		const {
			installationId,
			deviceId,
			functionId,
			refreshInterval,
			showValues,
			lynxId,
		} = attributes;

		return (
			<div
				{ ...useBlockProps.save( {
					className: 'iot-block-wrapper',
					'data-lynx': lynxId || '',
					'data-installation': installationId || '',
					'data-device': deviceId || '',
					'data-function': functionId || '',
					'data-textColor': attributes.textColor || '',
					'data-valueColor': attributes.valueColor || '',
					'data-backgroundColor': attributes.backgroundColor || '',
					'data-valueFontSize': attributes.valueFontSize || '',
					'data-functionFontSize': attributes.functionFontSize || '',
					'data-deviceFontSize': attributes.deviceFontSize || '',
					'data-lastUpdatedFontSize':
						attributes.lastUpdatedFontSize || '',
					'data-lastUpdatedPosition':
						attributes.lastUpdatedPosition || '',
					'data-refreshInterval': refreshInterval || 60,
					'data-showValues': JSON.stringify( showValues ),
				} ) }
			></div>
		);
	},
};

export default [ v1 ];
