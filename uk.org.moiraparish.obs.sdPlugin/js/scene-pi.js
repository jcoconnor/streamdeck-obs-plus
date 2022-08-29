
function updateSceneUI(obsScenes) {
	console.log("Doing updateSceneUI")
	document.getElementById('scenes').innerText = ''
	obsSceneLookup = obsScenes
	createScene('')
	obsScenes.forEach((scene) => {
		createScene(scene)
	})
	document.getElementById('scenes').value = scn_payload.currentScene
	updateSceneSources(scn_payload.currentScene)
	document.getElementById('sources').value = scn_payload.currentSource
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


function updateSettings() {
	console.log("Starting updateSettings")

	scn_payload.currentScene = document.getElementById('scenes').value
	scn_payload.currentSource = document.getElementById('sources').value

	StreamDeck.setSettings(_currentPlugin.context, {
		// Scene and Source are the actual properties saved in the PI as distinct from scenes and sources.
		scn_payload: scn_payload,
		buttonimage: decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, '')),
		buttonimagecontents: currentButtonImageContents
		// Save Button Image here as an image URL so we don't need to keep loading it from file.
		// Can we display image once we have grabbed it ?
	})
	console.log("Finished updateSettings call - now reset currents")
	currentButtonImage = decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, ''))
	console.log("Finished updateSettings", currentButtonImage)
}



document.getElementById('host').onchange = updateGlobalSettings
document.getElementById('port').onchange = updateGlobalSettings
document.getElementById('password').onchange = updateGlobalSettings

document.getElementById('scenes').onchange = updateScenes
document.getElementById('sources').onchange = updateSources
document.getElementById('buttonimage').onchange = updateButtonSettings

