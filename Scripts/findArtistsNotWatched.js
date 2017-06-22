
function getWatching() {
	var list = {};
	var artists = document.getElementsByClassName("artist_name");
	for (i = 0; i < artists.length; i ++) {
			list[artists[i].textContent] = true;
	}
	return list;
	//TODO: handle multiple pages (required if watching 1k+ artists)
}

function findArtistsNotWatched(file, callback) {
	var watching = getWatching();
	var notWatching = {};
	var read = new FileReader();
	read.onload = function(e) {
		var text = e.target.fileInput.result;
		var submissions = JSON.parse(text);
		for (s in submissions) {
			var artist = submissions[s].artist;
			if (!watching[artist]) {
				notWatching[artist] = true;
			}
		}
		callback(notWatching);
	}
	read.readAsText(file);
}

function initialize() {
	var fileInput = document.createElement("input");
	fileInput.setAttribute("type", "file");
	document.body.insertBefore(fileInput, document.body.firstChild);
	fileInput.addEventListener("change", function() {
		findArtistsNotWatched(this.files[0], function(artists) {
			for (artist in artists) {
				var a = document.createElement("a");
				a.href =  "/user/" + artist;
				document.body.insertBefore(a, fileInput);
			}
		});
	});
}

initialize();
