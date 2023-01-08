


function updateSceneUI(obsScenes) {
	console.log("Doing updateSceneUI")

	console.log("Is max_rect_width and other variables a thing here", max_rect_width)

	obsSceneLookup = obsScenes

	updateSceneControl('scenes_cam1')
	document.getElementById('scenes_cam1').value = pi_payload.currentScenes[0].slideScene

	updateSceneControl('scenes_cam2')
	document.getElementById('scenes_cam2').value = pi_payload.currentScenes[1].slideScene

	updateSceneControl('scenes_grouping')
	document.getElementById('scenes_grouping').value = pi_payload.currentSceneGrouping

}

function updateSceneControl(scene_id) {
	document.getElementById(scene_id).innerText = ''
	createScene('', scene_id)
	obsSceneLookup.forEach((scene) => {
		createScene(scene, scene_id)
	})

}



function createScene(scene,scene_id) {
	const option = document.createElement('option')
	option.innerText = scene.name
	document.getElementById(scene_id).appendChild(option)
}



function updateSettings() {
	console.log("Starting updateSettings")

	pi_payload.currentScenes[0].slideScene = document.getElementById('scenes_cam1').value
	pi_payload.currentScenes[0].camera     = piGetSceneCamera(pi_payload.currentScenes[0].slideScene)
	pi_payload.currentScenes[1].slideScene = document.getElementById('scenes_cam2').value
	pi_payload.currentScenes[1].camera     = piGetSceneCamera(pi_payload.currentScenes[1].slideScene)
	pi_payload.currentSceneGrouping = document.getElementById('scenes_grouping').value
	pi_payload.currentButtonImage = decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, ''))

	console.log("Showing PI Payload", pi_payload)

	StreamDeck.setSettings(_currentPlugin.context, {
		// Scene and Source are the actual properties saved in the PI as distinct from scenes and sources.
		pi_payload: pi_payload,
		// Save Button Image here as an image URL so we don't need to keep loading it from file.
		// Can we display image once we have grabbed it ?
	})
	console.log("Finished updateSettings call - now reset currents")

	console.log("Finished updateSettings", pi_payload.currentButtonImage)
}




document.getElementById('host').onchange = updateGlobalSettings
document.getElementById('port').onchange = updateGlobalSettings
document.getElementById('password').onchange = updateGlobalSettings

document.getElementById('scenes_cam1').onchange = updateSettings
document.getElementById('scenes_cam2').onchange = updateSettings
document.getElementById('scenes_grouping').onchange = updateSettings
document.getElementById('buttonimage').onchange = updateButtonSettings

