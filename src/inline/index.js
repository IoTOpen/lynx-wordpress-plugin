/**
 * Inline value: a rich text format that puts a live Lynx value inside running
 * text, for example "The water is 18.4 °C today".
 *
 * Stored in post content as
 *   <span class="iot-open-lynx-inline" data-lynx-backend=".." data-lynx-installation=".."
 *         data-lynx-device=".." data-lynx-function=".." data-lynx-field="formatted">18.4 °C</span>
 * The text is only a snapshot; the server replaces it with the current value
 * when the page is rendered and inline-view.js keeps it up to date.
 */
import { __ } from '@wordpress/i18n';
import { useCallback, useState } from '@wordpress/element';
import {
	registerFormatType,
	applyFormat,
	create,
	insert,
	remove,
	useAnchor,
} from '@wordpress/rich-text';
import { RichTextToolbarButton } from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FlexItem,
	Notice,
	Popover,
	SelectControl,
	__experimentalVStack as VStack, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

import { NS, SourceControls, useSourceLists } from '../shared/source';
import './editor.scss';
import './live';

const NAME = 'iot-open-lynx/inline-value';

const settings = {
	name: NAME,
	title: __( 'Lynx value', 'iot-open-lynx' ),
	tagName: 'span',
	className: 'iot-open-lynx-inline',
	attributes: {
		backend: 'data-lynx-backend',
		installation: 'data-lynx-installation',
		device: 'data-lynx-device',
		function: 'data-lynx-function',
		field: 'data-lynx-field',
	},
};

const FIELDS = [
	{ label: __( 'Value', 'iot-open-lynx' ), value: 'formatted' },
	{ label: __( 'Function name', 'iot-open-lynx' ), value: 'function_name' },
	{ label: __( 'Device name', 'iot-open-lynx' ), value: 'device_name' },
	{
		label: __( 'Installation name', 'iot-open-lynx' ),
		value: 'installation_name',
	},
	{ label: __( 'Last updated', 'iot-open-lynx' ), value: 'updated' },
];

/**
 * Finds the start and end of the inline value around the selection.
 *
 * @param {Object} value Rich text value.
 * @return {[number, number]} Start and end index.
 */
function activeRange( value ) {
	const has = ( i ) => value.formats[ i ]?.some( ( f ) => f.type === NAME );
	let start = value.start;
	let end = value.end;
	while ( start > 0 && has( start - 1 ) ) {
		start--;
	}
	while ( end < value.text.length && has( end ) ) {
		end++;
	}
	return [ start, end ];
}

function InlineForm( { initial, isActive, onApply, onRemove } ) {
	const [ source, setSource ] = useState( initial );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( null );
	const lists = useSourceLists( source );
	const onChange = useCallback(
		( changes ) => setSource( ( s ) => ( { ...s, ...changes } ) ),
		[]
	);

	const submit = async ( event ) => {
		event.preventDefault();
		setBusy( true );
		setError( null );
		try {
			const data = await apiFetch( {
				path: addQueryArgs( `${ NS }/data`, {
					backend: source.lynxId,
					installation: source.installationId,
					function: source.functionId,
				} ),
			} );
			const text = data?.[ source.field ];
			onApply(
				source,
				text !== undefined && text !== null && text !== ''
					? String( text )
					: '–'
			);
		} catch ( err ) {
			setError(
				err?.message || __( 'Could not load data.', 'iot-open-lynx' )
			);
			setBusy( false );
		}
	};

	const ready = source.lynxId && source.installationId && source.functionId;

	return (
		<form className="iot-open-lynx-inline-form" onSubmit={ submit }>
			<VStack spacing={ 3 }>
				<SourceControls
					source={ source }
					onChange={ onChange }
					lists={ lists }
				/>
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Show', 'iot-open-lynx' ) }
					value={ source.field }
					options={ FIELDS }
					onChange={ ( field ) => onChange( { field } ) }
				/>
				{ error && (
					<Notice status="error" isDismissible={ false }>
						{ error }
					</Notice>
				) }
				<Flex justify="flex-start">
					<FlexItem>
						<Button
							variant="primary"
							type="submit"
							isBusy={ busy }
							disabled={ ! ready || busy }
							__next40pxDefaultSize
						>
							{ isActive
								? __( 'Update', 'iot-open-lynx' )
								: __( 'Insert', 'iot-open-lynx' ) }
						</Button>
					</FlexItem>
					{ isActive && (
						<FlexItem>
							<Button
								variant="tertiary"
								isDestructive
								onClick={ onRemove }
								__next40pxDefaultSize
							>
								{ __( 'Remove', 'iot-open-lynx' ) }
							</Button>
						</FlexItem>
					) }
				</Flex>
			</VStack>
		</form>
	);
}

/**
 * The inline value at the caret: the active one, or one right next to a
 * collapsed caret. The snapshot text is hidden in the canvas, so clicking a
 * value usually puts the caret just before or after it.
 *
 * @param {Object}  value            Rich text value.
 * @param {boolean} isActive         Whether the format is active.
 * @param {Object}  activeAttributes Attributes of the active format.
 * @return {Object|null} Attributes, or null when there is no value at the caret.
 */
function currentAttributes( value, isActive, activeAttributes ) {
	if ( isActive ) {
		return activeAttributes;
	}
	if ( value.start !== value.end ) {
		return null;
	}
	const find = ( i ) => value.formats[ i ]?.find( ( f ) => f.type === NAME );
	const format = find( value.start - 1 ) || find( value.start );
	return format ? format.attributes || {} : null;
}

function Edit( { isActive, activeAttributes, value, onChange, contentRef } ) {
	const [ open, setOpen ] = useState( false );
	const anchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings,
	} );

	const current = currentAttributes( value, isActive, activeAttributes );
	const editing = !! current;

	const initial = {
		lynxId: current?.backend || '',
		installationId: current?.installation || '',
		// Old values without a stored device fall back to "all functions".
		deviceId: editing ? current.device || '0' : '',
		functionId: current?.function || '',
		field: current?.field || 'formatted',
	};

	const apply = ( source, text ) => {
		const format = {
			type: NAME,
			attributes: {
				backend: source.lynxId,
				installation: String( source.installationId ),
				device: String( source.deviceId ),
				function: String( source.functionId ),
				field: source.field,
			},
		};
		const [ start, end ] = editing
			? activeRange( value )
			: [ value.start, value.end ];
		const inserted = applyFormat(
			create( { text } ),
			format,
			0,
			text.length
		);
		// Leave the caret outside the value, so typing continues as plain text.
		onChange( {
			...insert( value, inserted, start, end ),
			activeFormats: [],
		} );
		setOpen( false );
	};

	const removeValue = () => {
		const [ start, end ] = activeRange( value );
		onChange( remove( value, start, end ) );
		setOpen( false );
	};

	return (
		<>
			<RichTextToolbarButton
				icon="chart-line"
				title={ __( 'Lynx value', 'iot-open-lynx' ) }
				onClick={ () => setOpen( true ) }
				isActive={ editing }
			/>
			{ open && (
				<Popover
					anchor={ anchor }
					placement="bottom"
					focusOnMount="firstElement"
					onClose={ () => setOpen( false ) }
					className="iot-open-lynx-inline-popover"
				>
					<InlineForm
						initial={ initial }
						isActive={ editing }
						onApply={ apply }
						onRemove={ removeValue }
					/>
				</Popover>
			) }
		</>
	);
}

registerFormatType( NAME, { ...settings, edit: Edit } );
