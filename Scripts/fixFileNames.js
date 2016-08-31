function fix(json) {
	var decode = JSON.parse(json);
	var fixedMetadata = {};
	for (var file in decode) {
		var name = decodeURIComponent(file);
		fixedMetadata[name] = decode[file]
		fixedMetadata[name].image = decodeURIComponent(fixedMetadata[name].image);
	}
	return JSON.stringify(fixedMetadata, null, 4);
}


function initialize() {
	var fileInput = document.createElement("input");
	fileInput.setAttribute("type", "file");
	fileInput.style.display = "block";
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
			output.innerHTML = fix(text);
		}
		read.readAsText(file);
	});
}

initialize();


//exiftool.exe -json=Formatted.json Images
