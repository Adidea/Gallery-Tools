function toExifJSON(json) {
	console.log(json);
	var data = JSON.parse(json);
	var exif = [];
	for (var file in data) {
		if (data.hasOwnProperty(file)) {
			exif.push({
				"SourceFile": file,
				//I just noticed title is missing from the last version of my scraper, where'd it go?
				"Creator": data[file].artist,
				"CreatorWorkUrl": data[file].submission,
				"Description": data[file].description,
				"Subject": data[file].tags,
				"Keywords": data[file].tags,
			//TODO: setup category and common tag heiarchies EX: "HierarchicalSubject": ["Gender|Male", "Medium|Artwork (Traditional)"]
			});
		}
	}
	return JSON.stringify(exif, null, 4);
}

function initialize() {
	var fileInput = document.createElement("input");
	fileInput.setAttribute("type", "file");
	document.body.insertBefore(fileInput, document.body.firstChild);
	fileInput.addEventListener("change", function() {
		var file = this.files[0];
		var read = new FileReader();
		read.onload = function(e) {
			var text = e.target.result;
			var output = document.createElement("textarea");
			output.setAttribute("wrap","off");
			output.setAttribute("readonly","");
			output.style.width = "100%";
			output.style.height = "100%";
			document.body.appendChild(output);
			output.innerHTML = toExifJSON(text);
		}
		read.readAsText(file);
	});
}

initialize();


//exiftool.exe -json=Formatted.json Images
