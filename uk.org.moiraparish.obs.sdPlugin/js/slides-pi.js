



function updateSceneUI(obsScenes) {
	console.log("Doing updateSceneUI")

	obsSceneLookup = obsScenes

	updateSceneControl('scenes_cam1')
	document.getElementById('scenes_cam1').value = currentSceneCam1

	updateSceneControl('scenes_cam2')
	document.getElementById('scenes_cam2').value = currentSceneCam2

	updateSceneControl('scenes_cam3')
	document.getElementById('scenes_cam3').value = currentSceneCam3

	updateSceneControl('scenes_grouping')
	document.getElementById('scenes_grouping').value = currentSceneGrouping

}

function updateSceneControl(scene_id) {
	console.log("Working on scene control", scene_id)
	document.getElementById(scene_id).innerText = ''
	createScene('', scene_id)
	obsSceneLookup.forEach((scene) => {
		createScene(scene, scene_id)
	})

}




function createScene(scene,scene_id) {
	console.log("Creating scene", scene, scene_id)
	const option = document.createElement('option')
	option.innerText = scene.name
	document.getElementById(scene_id).appendChild(option)
}




function updateSettings() {
	console.log("Starting updateSettings")

	StreamDeck.setSettings(_currentPlugin.context, {
		// Scene and Source are the actual properties saved in the PI as distinct from scenes and sources.
		scene_cam1: document.getElementById('scenes_cam1').value,
		scene_cam2: document.getElementById('scenes_cam2').value,
		scene_cam3: document.getElementById('scenes_cam3').value,
		scene_grouping: document.getElementById('scenes_grouping').value,
		buttonimage: decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, '')),
		buttonimagecontents: currentButtonImageContents
		// Save Button Image here as an image URL so we don't need to keep loading it from file.
		// Can we display image once we have grabbed it ?
	})
	console.log("Finished updateSettings call - now reset currents")

	currentSceneCam1 = document.getElementById('scenes_cam1').value,
	currentSceneCam2 = document.getElementById('scenes_cam2').value,
	currentSceneCam3 = document.getElementById('scenes_cam3').value,
	currentSceneGrouping = document.getElementById('scenes_grouping').value,

	currentButtonImage = decodeURIComponent(document.getElementById('buttonimage').value.replace(/^C:\\fakepath\\/, ''))
	console.log("Finished updateSettings", currentButtonImage)
}






document.getElementById('host').onchange = updateGlobalSettings
document.getElementById('port').onchange = updateGlobalSettings
document.getElementById('password').onchange = updateGlobalSettings

document.getElementById('scenes_cam1').onchange = updateSettings
document.getElementById('scenes_cam2').onchange = updateSettings
document.getElementById('scenes_cam3').onchange = updateSettings
document.getElementById('scenes_grouping').onchange = updateSettings
document.getElementById('buttonimage').onchange = updateButtonSettings

