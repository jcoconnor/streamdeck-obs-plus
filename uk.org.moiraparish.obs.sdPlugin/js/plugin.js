const debug = true
// 
const obs = new OBSWebSocket()
const sceneAction = 'uk.org.moiraparish.obs.scene-btn'
const slideAction = 'uk.org.moiraparish.obs.slides-btn'

const ConnectionState = {
	FAILED: -2,
	DISCONNECTED: -1,
	CONNECTING: 0,
	CONNECTED: 1,
	AUTHENTICATED: 2
}

function printConnectionState() {
	if (debug) console.log(`connectionState = ${connectionState} (${Object.keys(ConnectionState)[Object.values(ConnectionState).indexOf(connectionState)]})`)
}

let settings = {
	host: 'localhost',
	port: '4444',
	password: ''
}

let pluginUUID
let connectionState = ConnectionState.DISCONNECTED
let currentPI
let buttons = {}

let OBS = {
	scenes: [
		{name: "" ,
		sources: []},
	],
	studioMode: null,
	program: {
		sceneName: '',
		camera: '',
		current: {
			button: '',
			type: ''
		},
		next: {
			button: '',
			type: ''
		},
		slideBaseScene: '',
		sources: []
	},
	preview: {
		sceneName: '',
		camera: '',
		current: {
			button: '',
			type: ''
		},
		next: {
			button: '',
			type: ''
		},
		slideBaseScene: '',
		sources: []
	}
}


connect()
function connect() {
	switch (connectionState) {
		case ConnectionState.FAILED:
			if (debug) console.log('FAILED: will not connect')
			break
		case ConnectionState.DISCONNECTED:
			if (debug) console.log('DISCONNECTED: will try to connect')
			obs.connect({
				address: `${settings.host}:${settings.port}`,
				password: settings.password
			})
			break
		case ConnectionState.CONNECTING:
			if (debug) console.log('CONNECTING: nothing to do')
			break
		case ConnectionState.CONNECTED:
			if (debug) console.log('CONNECTED: nothing to do')
			break
		case ConnectionState.AUTHENTICATED:
			if (debug) console.log('AUTHENTICATED: nothing to do')
			break
		default:
			obs.disconnect()
			ConnectionState.DISCONNECTED
	}
}

obs.on('ConnectionOpened', () => {
	connectionState = ConnectionState.CONNECTED
	printConnectionState()
})
obs.on('ConnectionClosed', () => {
	if (connectionState == ConnectionState.FAILED) return
	connectionState = ConnectionState.DISCONNECTED
	printConnectionState()
	OBS.scenes = []
	clearPreviewButtons()
	clearProgramButtons()
	//setButtonsOffline()
})
obs.on('AuthenticationSuccess', () => {
	connectionState = ConnectionState.AUTHENTICATED
	printConnectionState()
	obsUpdateStudioStatus()
	obsUpdateScenes()
	updateButtons()
	//setButtonsOnline()
})
obs.on('AuthenticationFailure', () => {
	connectionState = ConnectionState.FAILED
	printConnectionState()
})

obs.on('ScenesChanged', obsUpdateScenes)
obs.on('PreviewSceneChanged', handlePreviewSceneChanged)
obs.on('SwitchScenes', handleProgramSceneChanged)
obs.on('StudioModeSwitched', handleStudioModeSwitched)

obs.on('SceneItemAdded', obsUpdateScenes)
obs.on('SceneItemRemoved', obsUpdateScenes)


obs.on('Exiting', () => {
	obs.disconnect()
	console.log('OBS Disconnecting')
})


function obsUpdateScenes() {
	console.log("Entering obsUpdateScenes")
	let scene_dump = {}
	obs.send('GetSceneList').then((data) => {
		scene_dump = data
		console.log("Scene Dump Structure", scene_dump)
	}).then(() => {
		OBS.scenes = scene_dump.scenes.map((s) => {
			// Make an oject here with source name, source_type, and sub-scene as option.
			let source_list = []
			s.sources.forEach((src) => {
					source_list.push({'name': src.name, 'type': src.type})
					if (src.type == "scene") {
						scene_dump.scenes.forEach((subscene) => {
							if (subscene.name == src.name) {
								subscene.sources.forEach((subSrc) => {
									source_list.push({'name': subSrc.name, 'type': subSrc.type})
								})
							}
						})
					}
			})
			return {"name": s.name, "sources": source_list}
		})
	}).then(() => {
		// Send scene list to Streamdeck as as global setting.
		// TODO - Holding on this as it fails until we are connected.
		console.log("OBS Scene List", OBS.scenes)
		// sendUpdatedScenesToPI()
	})
	if (OBS.studioMode) obs.send('GetPreviewScene').then(handlePreviewSceneChanged)
}

function obsGetSceneSources(scene_name) {

	let scene_sources = []

	for (sc of OBS.scenes) {
		if (sc.name == scene_name) {
			scene_sources = sc.sources
			break
		}
	}
	return_sources = []
	for (srcs of scene_sources) {
		return_sources.push(srcs.name)
	}

	return return_sources
}

function obsGetSceneCamera(scene_name) {
	console.log("Checking for NDI Camera", scene_name)

	let scene_sources = []

	for (sc of OBS.scenes) {
		if (sc.name == scene_name) {
			scene_sources = sc.sources
			break
		}
	}
	for (srcs of scene_sources) { 
		console.log("Looking for camera match", srcs)
		if (srcs.type == 'ndi_source' && srcs.name.includes('Camera')) return srcs.name
	}

	return ""
}


function obsUpdateStudioStatus() {

	// Populate the OBS Structure with the current OBS scenes.

	obs.send('GetStudioModeStatus').then((data) => {
		OBS.studioMode = data['studio-mode']
	})

	obs.send('GetCurrentScene').then((data) => {
		let scenelist = []
		OBS.program.sceneName = data['name']
		scenelist = data['sources']
		console.log("obsUpdateStudioStatus", OBS.program.sceneName, scenelist)
		for (sc of scenelist) {
			OBS.program.sources.push(sc.name)
			if (sc.type == "ndi_source") {
				OBS.program.camera = sc.name
			}
		}
	})

	obs.send('GetPreviewScene').then((data) => {
		let scenelist = []
		OBS.preview.sceneName = data['name']
		scenelist = data['sources']
		console.log("obsUpdateStudioStatus", OBS.preview.sceneName, scenelist)
		for (sc of scenelist) {
			OBS.preview.sources.push(sc.name)
			if (sc.type == "ndi_source") {
				OBS.preview.camera = sc.name
			}
		}
	})
	console.log("obsUpdateStudioStatus", OBS)

}

function updatePI(e) {
	if (connectionState != ConnectionState.AUTHENTICATED) connect()
	currentPI = {
		context: e.context,
		action: e.action
	}
	sendUpdatedScenesToPI()
	// sendButtonImageToPi(e) // TODO - do we need this anymore
//	document.querySelector('.sdpi-file-info[for="buttonimage"]').textContent = 'marina.png';
}

function sendUpdatedScenesToPI() {
	StreamDeck.sendToPI(currentPI.context, sceneAction, {
		scenes: OBS.scenes
	})
}


function sendButtonImageToPi (e) {
	// Todo ????
//	StreamDeck.sendToPI(currentPI.context, sceneAction, {
//		buttonimage: buttons[e.context].buttonimage,
//		buttonimagecontents: buttons[e.context].buttonimagecontents
//	})

}



function handleStreamDeckMessages(e) {
	const data = JSON.parse(e.data)
	if (debug) console.log(`${data.event}: `, data)
	switch(data.event) {
		case 'deviceDidConnect':
			StreamDeck.getGlobalSettings(pluginUUID)
			break
		case 'keyDown':
			printConnectionState()
			console.log("Received Key Down", data)
			if (connectionState == ConnectionState.AUTHENTICATED) {
				buttons[data.context].keyDown()
			} else {
				connectionState = ConnectionState.DISCONNECTED
				connect()
				setTimeout(() => {
					if (connectionState == ConnectionState.AUTHENTICATED) {
						buttons[data.context].keyDown()
					} else {
						StreamDeck.sendAlert(data.context)
					}
				}, 10)
			}
			break
		case 'keyUp':
			printConnectionState()
			console.log("Received Key Up", data)
			// TBD - do we need anything here anymore ?
			console.log("Key Up: OBS is", OBS)
			break;
		case 'willAppear':
		case 'titleParametersDidChange':
		case 'didReceiveSettings':
			if (buttons[data.context]) {
				console.log("didReceiveSettings with context", data.context, data)
				buttons[data.context].processStreamDeckData(data)
			} else {
				let type = ''
				switch (data.action) {
					case sceneAction:
						type = 'scene'
						break
					case slideAction:
						type = 'slide'
						break
					default:
						type = 'none'
				}
			
				buttons[data.context] = new Button(type, data)
				console.log("didReceiveSettings Updating Button", data)
				if (type != '') updateButton(data.context)
			}
			break
		case 'willDisappear':
			delete buttons[data.context]
			break
		case 'propertyInspectorDidAppear':
			updatePI(data)
			break
		case 'didReceiveGlobalSettings':
			handleGlobalSettingsUpdate(data)
			break
		case 'sendToPlugin':
			if (data.payload.updateGlobalSettings) {
				StreamDeck.getGlobalSettings(pluginUUID)
			}
		default:
			if (debug) console.log('Unhandled event:', data)
			break
		case 'keyUp':
			break
	}
}

function connectElgatoStreamDeckSocket(port, uuid, registerEvent, info) {
	if (debug) StreamDeck.debug = true
	pluginUUID = uuid
	StreamDeck._ws = new WebSocket("ws://localhost:" + port)
	StreamDeck._ws.onopen = () => {
		StreamDeck._openHandler(registerEvent, uuid)
	}
	StreamDeck._ws.onmessage = handleStreamDeckMessages
}

function handleGlobalSettingsUpdate(e) {
	if (Object.keys(e.payload.settings).length != 0) settings = e.payload.settings
	if (connectionState > ConnectionState.CONNECTING) {
		obs.disconnect()
		connectionState = ConnectionState.DISCONNECTED
		connect()
	}
}


function handleProgramSceneChanged(e) {
	console.log("handleProgramSceneChanged: Just before Program Scene Change - OBS is", OBS)
	console.log("e is ", e)
	let _program = ''
	if (e['scene-name']) _program = e['scene-name']
	if (e['name']) _program = e['name']
	// TODO - is this correct or do we need to lock it ?
	// OBS.program.slideBaseScene = ''

	if (_program != OBS.program.sceneName) {
		console.log("_program:", _program, "sceneName:", OBS.program.sceneName )
		let button = {}
		OBS.program.sceneName = _program
		if (OBS.program.next.button) {
			button = buttons[OBS.program.next.button]
			console.log("pi_Payload:", button.pi_payload, "type:", buttons.type)
			if (button.type == 'slide') {
				OBS.program.slideBaseScene = button.pi_payload.slideBaseScene
			}
		}

		// Save the program sources
		OBS.program.sources = obsGetSceneSources(_program)
		OBS.program.camera = obsGetSceneCamera(_program)
		console.log("Program Scene Change - Updated OBS to", OBS)
		updateButtons()
	}
	console.log("handleProgramSceneChanged: After Program Scene Change - OBS is", OBS)
}

function handlePreviewSceneChanged(e) {
	// NB - think there is an async issue with this dump as it reflects the post change scenario.
	console.log("handlePreviewSceneChanged: Just before Preview Scene Change - OBS is", OBS)
	console.log("e is ", e)
	let _preview = ''
	if (e['scene-name']) _preview = e['scene-name']
	if (e['name']) _preview = e['name']
	// OBS.preview.slideBaseScene = ''

	if (_preview != OBS.preview.sceneName) {
		console.log("_preview:", _preview, "sceneName:", OBS.preview.sceneName )
		let button = {}
		OBS.preview.sceneName = _preview
		// Save the preview sources
		OBS.preview.sources = obsGetSceneSources(_preview)
		OBS.preview.camera = obsGetSceneCamera(_preview)
		console.log("Preview Scene Change - Updated OBS to", OBS)
		if (OBS.preview.next.button) {
			button = buttons[OBS.preview.next.button]
			console.log("pi_Payload:", button.pi_payload, "type:", button.type)
			if (button.type == 'slide') {
				armSlides(button.pi_payload.currentScene, OBS.preview.camera)
				OBS.preview.slideBaseScene = button.pi_payload.slideBaseScene
			}
		}
		updateButtons()
	}
	console.log("handlePreviewSceneChanged: After Preview Scene Change - OBS is", OBS)
}

function handleStudioModeSwitched(e) {
	console.log("handleStudioModeSwitched e", e)
	OBS.studioMode = e['new-state']
}

function clearProgramButtons() {
	findProgramButtons().forEach((b) => {
		buttons[b].setOffAir()
	})
}
function clearPreviewButtons() {
	findPreviewButtons().forEach((b) => {
		buttons[b].setOffAir()
	})
}

function updateProgramButtons() {
	let programButtons = []
	programButtons = findButtonsByScene(OBS.program.sceneName)
	console.log(">>>>>>>>>>>>>>>Updating Program Buttons", OBS, "Buttons", programButtons)
	programButtons.forEach((b) => {
		buttons[b].setProgram()
	})
	findButtonsBySource(OBS.program.sources).forEach((b) => {
		if (!programButtons.includes(b)) buttons[b].setSourceProgram()
	})
}

function updatePreviewButtons() {
	let previewButtons = []
	previewButtons = findButtonsByScene(OBS.preview.sceneName)
	console.log(">>>>>>>>>>>>>>>>Updating Preview Buttons", OBS, "Buttons", previewButtons)
	previewButtons.forEach(b => {
		buttons[b].setPreview()
	})
	findButtonsBySource(OBS.preview.sources).forEach(b => {
		if (!previewButtons.includes(b))  buttons[b].setSourcePreview()
	})
}

function clearRestOfButtons() {
	console.log("clearRestOfButtons Program Buttons")
	let previewButtons = []
	let programButtons = []
	programButtons = findButtonsByScene(OBS.program.sceneName, OBS.program.sources)
	previewButtons = findButtonsByScene(OBS.preview.sceneName, OBS.preview.sources)
	console.log("clearRestOfButtons Program Buttons", programButtons)
	console.log("clearRestOfButtons Preview Buttons", previewButtons)
	Object.keys(buttons).forEach((b) => {
		if (programButtons.includes(b)) {
			console.log("Ignoring program button", b)
		} else if (previewButtons.includes(b)) {
			console.log("Ignoring preview button", b)
		} else {
			console.log("setting button off air", b)
			buttons[b].setOffAir()
		}
	})

}

function updateButtons() {
	// console.log("..........Running updateButtons")
	if (OBS.preview.sceneName != OBS.program.sceneName) updatePreviewButtons()
	updateProgramButtons()
	// Only do this if we have separate preview/live to avoid buttons getting clobbered.
	if (OBS.preview.sceneName != OBS.program.sceneName) clearRestOfButtons()

}

function armSlides(previewSlideScene, baseCamera) {
	console.log("Arm Slides", "prev slide:", previewSlideScene, "baseCam:", baseCamera)
	Object.keys(buttons).forEach((b) => {
		if (buttons[b].type == 'slide' && buttons[b].pi_payload.currentScene != previewSlideScene) {
			console.log("Working on button", buttons[b])
			slideScene = ''
			let curSc = {}
			for (curSc of buttons[b].pi_payload.currentScenes) {
				console.log("Scene:", curSc.slideScene, "Camera", curSc.camera)
				if (baseCamera == curSc.camera) {
					slideScene = curSc.slideScene
				}
			}
			buttons[b].pi_payload.currentScene = slideScene
			buttons[b].pi_payload.currentSource = baseCamera
			console.log("Arm Slides - slideScene", slideScene, buttons[b])
		}
	})
}

function disarmSlides(all) {
	// Disarm slides completely - clear all slide buttons and flags.

	console.log("Disarming Slides", all)

	Object.keys(buttons).forEach((b) => {
		if (buttons[b].type == 'slide' ) {
			// Test for live slide......
			console.log("Working on button", buttons[b])
			slideScene = ''
			buttons[b].pi_payload.currentScene = ''
			buttons[b].pi_payload.currentSource = ''
			console.log("Disarm Slides - slideScene", slideScene, buttons[b])
		}
	})

}

function updateButton(context) {
	// console.log("UpdateButton", context)
	if (buttons[context].pi_payload.currentScene == OBS.program.sceneName) {
		buttons[context].setProgram()
	} else if (buttons[context].pi_payload.currentScene == OBS.preview.sceneName) {
		buttons[context].setPreview()
	} else {
		buttons[context].setOffAir()
	}
}

function findButtonsByScene(scene, source_list) {
	console.log("findButtonsByScene", scene, source_list)
	let output = []
	Object.keys(buttons).forEach((b) => {
		console.log("findButtonsByScene b=", b, "button", buttons[b])
		if (buttons[b].pi_payload.currentScene && buttons[b].pi_payload.currentScene == scene) {
			output.push(b)
		} else if (source_list && source_list.length > 0 && source_list.includes(buttons[b].pi_payload.currentSource)) {
			output.push(b)
		}
	})
	return output
}

function findButtonsBySource(source_list) {
	let output = []
	Object.keys(buttons).forEach((b) => {
		if (buttons[b].pi_payload.currentSource && source_list.includes(buttons[b].pi_payload.currentSource)) {
			output.push(b)
		}
	})
	return output
}


function findPreviewButtons() {
	let output = []
	Object.keys(buttons).forEach((b) => {
		button_state = keyInactive
		if (buttons[b].state) button_state = buttons[b].state
		if (button_state == keyPreview || button_state == keySourcePreview) {
			output.push(b)
		}
	})
	return output
}

function findProgramButtons() {
	let output = []
	Object.keys(buttons).forEach((b) => {
		button_state = keyInactive
		if (buttons[b].state) button_state = buttons[b].state
		if (button_state == keyLiveOutput || button_state == keySourceLive) {
			output.push(b)
		}
	})
	return output
}


function setButtonsOffline() {
	console.log("Setting Buttons Online -------------------------------------------------------------")
	Object.values(buttons).forEach((b) => {
		b.setOffline()
	})
}

function setButtonsOnline() {
	console.log("Setting Buttons Online +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
	Object.values(buttons).forEach((b) => {
		b.setOnline()
	})
}

