/**
 * Settings page: manage the list of Lynx backends.
 */
import { __, sprintf } from '@wordpress/i18n';
import { createRoot, useEffect, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';
import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Flex,
	FlexItem,
	SnackbarList,
	Spinner,
	TextControl,
	__experimentalVStack as VStack, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';

const OPTION = 'iot_open_lynx_backends';

function newBackend() {
	return {
		id: window.crypto?.randomUUID?.() || String( Date.now() ),
		name: '',
		base_uri: 'https://lynx.iotopen.se',
		api_key: '',
	};
}

function BackendCard( { backend, onChange, onRemove } ) {
	const [ testing, setTesting ] = useState( false );
	const [ result, setResult ] = useState( null );
	const set = ( key ) => ( value ) => {
		setResult( null );
		onChange( { ...backend, [ key ]: value } );
	};

	const test = async () => {
		setTesting( true );
		setResult( null );
		try {
			const res = await apiFetch( {
				path: '/iot-open-lynx/v1/test-backend',
				method: 'POST',
				data: { base_uri: backend.base_uri, api_key: backend.api_key },
			} );
			setResult( {
				ok: true,
				message: sprintf(
					/* translators: %d: number of installations. */
					__(
						'Connection OK – %d installations available.',
						'iot-open-lynx'
					),
					res.installations
				),
			} );
		} catch ( err ) {
			setResult( { ok: false, message: err.message } );
		}
		setTesting( false );
	};

	return (
		<Card>
			<CardHeader>
				<strong>
					{ backend.name || __( 'Unnamed backend', 'iot-open-lynx' ) }
				</strong>
			</CardHeader>
			<CardBody>
				<VStack spacing={ 3 }>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Name', 'iot-open-lynx' ) }
						help={ __(
							'Shown to editors when picking a backend.',
							'iot-open-lynx'
						) }
						value={ backend.name }
						onChange={ set( 'name' ) }
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						type="url"
						label={ __( 'Base URI', 'iot-open-lynx' ) }
						value={ backend.base_uri }
						onChange={ set( 'base_uri' ) }
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						type="password"
						autoComplete="new-password"
						label={ __( 'API key', 'iot-open-lynx' ) }
						help={ __(
							'Create an API key under your user profile in Lynx (Security tab). Leave empty to use the public API. Use a key with read-only access.',
							'iot-open-lynx'
						) }
						value={ backend.api_key }
						onChange={ set( 'api_key' ) }
					/>
					<Flex justify="flex-start">
						<FlexItem>
							<Button
								variant="secondary"
								onClick={ test }
								isBusy={ testing }
								disabled={ testing || ! backend.base_uri }
							>
								{ __( 'Test connection', 'iot-open-lynx' ) }
							</Button>
						</FlexItem>
						<FlexItem>
							<Button
								variant="tertiary"
								isDestructive
								onClick={ onRemove }
							>
								{ __( 'Remove', 'iot-open-lynx' ) }
							</Button>
						</FlexItem>
						{ result && (
							<FlexItem>
								<span
									style={ {
										color: result.ok
											? '#008a20'
											: '#d63638',
									} }
								>
									{ result.message }
								</span>
							</FlexItem>
						) }
					</Flex>
				</VStack>
			</CardBody>
		</Card>
	);
}

function SettingsPage() {
	const [ backends, setBackends ] = useState( null );

	const site = useSelect(
		( select ) => select( coreStore ).getEntityRecord( 'root', 'site' ),
		[]
	);
	const notices = useSelect(
		( select ) =>
			select( noticesStore )
				.getNotices()
				.filter( ( n ) => n.type === 'snackbar' ),
		[]
	);
	const { removeNotice, createNotice } = useDispatch( noticesStore );
	const { saveEntityRecord } = useDispatch( coreStore );
	const [ saving, setSaving ] = useState( false );

	useEffect( () => {
		if ( site && backends === null ) {
			setBackends( site[ OPTION ] || [] );
		}
	}, [ site, backends ] );

	if ( backends === null ) {
		return <Spinner />;
	}

	const save = async () => {
		setSaving( true );
		try {
			const saved = await saveEntityRecord(
				'root',
				'site',
				{ [ OPTION ]: backends },
				{ throwOnError: true }
			);
			setBackends( saved?.[ OPTION ] || backends );
			createNotice( 'success', __( 'Settings saved.', 'iot-open-lynx' ), {
				type: 'snackbar',
			} );
		} catch ( err ) {
			createNotice(
				'error',
				err?.message ||
					__( 'Could not save settings.', 'iot-open-lynx' ),
				{ type: 'snackbar' }
			);
		}
		setSaving( false );
	};

	const update = ( i ) => ( backend ) =>
		setBackends( backends.map( ( b, j ) => ( j === i ? backend : b ) ) );

	return (
		<VStack spacing={ 4 } style={ { maxWidth: 720 } }>
			<p>
				{ __(
					'Add one or more IoT Open Lynx backends. Values shown in blocks are fetched by WordPress using these credentials and cached for a few seconds; the API key is never sent to visitors.',
					'iot-open-lynx'
				) }
			</p>

			{ backends.map( ( backend, i ) => (
				<BackendCard
					key={ backend.id || i }
					backend={ backend }
					onChange={ update( i ) }
					onRemove={ () =>
						setBackends( backends.filter( ( _, j ) => j !== i ) )
					}
				/>
			) ) }

			<Flex justify="flex-start">
				<FlexItem>
					<Button
						variant="secondary"
						onClick={ () =>
							setBackends( [ ...backends, newBackend() ] )
						}
					>
						{ __( 'Add backend', 'iot-open-lynx' ) }
					</Button>
				</FlexItem>
				<FlexItem>
					<Button
						variant="primary"
						onClick={ save }
						isBusy={ saving }
						disabled={ saving }
					>
						{ __( 'Save settings', 'iot-open-lynx' ) }
					</Button>
				</FlexItem>
			</Flex>

			<SnackbarList
				className="iot-open-lynx-snackbars"
				notices={ notices }
				onRemove={ removeNotice }
			/>
		</VStack>
	);
}

const mount = () => {
	const el = document.getElementById( 'iot-open-lynx-settings' );
	if ( el ) {
		createRoot( el ).render( <SettingsPage /> );
	}
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mount );
} else {
	mount();
}
