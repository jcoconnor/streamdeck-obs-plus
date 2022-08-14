let _currentPlugin
let currentScene
let currentSource
let currentButtonImage
let currentButtonImageContents = []
let currentContext
let obsSceneLookup = {}

let ndi_source = 'ndi_source'

function connectElgatoStreamDeckSocket(port, uuid, registerEvent, info, action) {
	data = JSON.parse(action)
	console.log("Payload from streamdeck", data.payload)
	currentScene = data.payload.settings.scene
	currentSource = data.payload.settings.source
	_currentPlugin = {
		action: data.action,
		context: uuid
	}
	StreamDeck.debug = true
	StreamDeck._ws = new WebSocket("ws://localhost:" + port)
	StreamDeck._ws.onopen = () => {
		StreamDeck._openHandler(registerEvent, uuid)
		StreamDeck.getGlobalSettings(_currentPlugin.context)
	}
	StreamDeck._ws.onmessage = (e) => {
		const data = JSON.parse(e.data)
		switch(data.event) {
			case 'sendToPropertyInspector':
				console.log("And its the PROPERTY INSPECTOR", data)
				currentContext = data.context
				if (data.payload.settings) updateSettingsUI(data)
				if (data.payload.scenes) updateSceneUI(data.payload.scenes)
				if (data.payload.buttonimage) {
					console.log("Got something on buttonimage", currentButtonImage)
					currentButtonImage = data.payload.buttonimage
					currentButtonImageContents = data.payload.buttonimagecontents
					updateButtonImage()
				}
				
				break
			case 'didReceiveGlobalSettings':
				updateSettingsUI(data)
				break
			default:
				console.log(data)
				break
		}
	}
}

function updateSettingsUI(data) {
	if (data.payload.settings && Object.keys(data.payload.settings).length > 0) {
		document.getElementById('host').value = data.payload.settings.host
		document.getElementById('port').value = data.payload.settings.port
		document.getElementById('password').value = data.payload.settings.password ? 'password' : ''
	}
}

function updateGlobalSettings() {
	console.log("Doing updateGlobalSettings")
	let settings = {
		host: document.getElementById('host').value,
		port: document.getElementById('port').value
	}
	if (document.getElementById('password').value != 'password') settings.password = document.getElementById('password').value
	StreamDeck.setGlobalSettings(_currentPlugin.context, settings)
	StreamDeck.sendToPlugin(_currentPlugin.context, _currentPlugin.action, {updateGlobalSettings: true})
}

function updateSceneUI(obsScenes) {
	console.log("Doing updateSceneUI")
	document.getElementById('scenes').innerText = ''
	obsSceneLookup = obsScenes
	createScene('')
	obsScenes.forEach((scene) => {
		createScene(scene)
	})
	document.getElementById('scenes').value = currentScene
	updateSceneSources(currentScene)
	document.getElementById('sources').value = currentSource
}

function createScene(scene) {
	const option = document.createElement('option')
	option.innerText = scene.name
	document.getElementById('scenes').appendChild(option)
}


function updateScenes() {
	console.log("Starting updateScenes")
	scene = document.getElementById('scenes').value
	updateSceneSources(scene)
	updateSettings()
}


function updateSceneSources(scene) {
	document.getElementById('sources').innerText = ''
	createSource('')
	obsSceneLookup.forEach((scn) => {
		if (scn.name == scene) {
			scn.sources.forEach((src) => {
				if (src.type == ndi_source) {
					createSource(src.name)
				}
			})
		}
	})
}


function createSource(source) {
	const option = document.createElement('option')
	option.innerText = source
	document.getElementById('sources').appendChild(option)
}


function updateSources() {
	console.log("Starting updateSources")
	updateSettings()
}


function updateButtonSettings () {
	console.log("Starting updateButtonSettings")
	path = decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, ''))

	readFile(path, {responseType: 'blob'}).then((b64) => {
		console.log("Button File ", path, b64);
		currentButtonImageContents = b64
		console.log("currentButtonImageContents", currentButtonImageContents)
		updateSettings()
		// updateButton(currentContext)
	})
}


function updateSettings() {
	console.log("Starting updateSettings")

	StreamDeck.setSettings(_currentPlugin.context, {
		// Scene and Source are the actual properties saved in the PI as distinct from scenes and sources.
		scene: document.getElementById('scenes').value,
		source: document.getElementById('sources').value,
		buttonimage: decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, '')),
		buttonimagecontents: currentButtonImageContents
		// Save Button Image here as an image URL so we don't need to keep loading it from file.
		// Can we display image once we have grabbed it ?
	})
	console.log("Finished updateSettings call - now reset currents")
	currentScene = document.getElementById('scenes').value
	currentSource = document.getElementById('sources').value
	currentButtonImage = decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, ''))
	console.log("Finished updateSettings", currentButtonImage)
}


function updateButtonImage () {
	console.log("updateButtonImage", currentButtonImage)
	document.getElementById('buttonimage').value = ""
}

document.getElementById('host').onchange = updateGlobalSettings
document.getElementById('port').onchange = updateGlobalSettings
document.getElementById('password').onchange = updateGlobalSettings
document.getElementById('scenes').onchange = updateScenes
document.getElementById('sources').onchange = updateSources
document.getElementById('buttonimage').onchange = updateButtonSettings

function readFile(fileName, props = {}) {
    return new Promise(function(resolve, reject) {
        const request = Object.assign(new XMLHttpRequest(), props || {});
        request.open('GET', fileName, true);
        request.onload = (e, f) => {
            const isBlob = request.responseType == "blob" || (request.response instanceof Blob || ['[object File]', '[object Blob]'].indexOf(Object.prototype.toString.call(request.response)) !== -1);

            console.log("utils.readFile", request, 'isBlob', isBlob, this);

            if(isBlob) {
                const reader = new FileReader();
                reader.onloadend = (evt) => {
                    resolve(evt.target.result);
                };
                console.log("readAsDataURL");
                reader.readAsDataURL(request.response);
            } else if(request.responseType == 'arraybuffer') {
                console.log("arraybuffer");
                resolve(request.response);
            } else {
                console.log("responseText");
                resolve(request.responseText);
            }
        };
        request.send();
    });
}

