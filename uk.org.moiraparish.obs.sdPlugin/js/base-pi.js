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
				if (data.payload.scenes) {
                    console.log("Going to updateSceneUI")
                    updateSceneUI(data.payload.scenes)
                }
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


function updateButtonImage () {
	console.log("updateButtonImage", currentButtonImage)
	document.getElementById('buttonimage').value = ""
}

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

