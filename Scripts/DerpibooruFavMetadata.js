// ==UserScript==
// @name         Derpibooru Fav Metadata
// @namespace    Artex
// @version      0.1
// @description  generates json metadata from derpibooru favorites
// @author       Artex
// @match        https://derpibooru.org/search*
// @grant        none
// ==/UserScript==

(function() {
	var favorites = [];
	
	function getFavorites(page, callback) {
		var url = "/search.json?q=my:faves&page=" + page;
		var httpReq = new XMLHttpRequest();
		httpReq.addEventListener('load', function () {
			console.log(httpReq.response, url);
			if (httpReq.status == '200') {
				if (this.response.search.length > 1) {
					favorites = favorites.concat(this.response.search);
					getFavorites( +page + 1, callback);
				} else { //no images
					callback(favorites);
				}
			} else { //bad request, throttle back temporarily
				window.setTimeout(getFavorites(page, callback), 4000);
			}
		});
		httpReq.open('GET', url);
		httpReq.responseType = 'json';
		httpReq.send();
	}
	function getAllFavorites(callback) {
		getFavorites(1, callback);
	}
	
	function isArtist(str) {
		if (str.match(/^artist:/)[0]) {
			return true;
		} else {
			return false;
		}
	}
	
	function parseImageData(images) {
		console.log("Test", images);
		var metadata = {};
		for ( var i = 0; i < images.length; i++) {
			var image = images[i];
			console.log(i, image);
			var artist = image.tags.match(/artist:([^,]+)/);
			var tags = image.tags.split(', ');
			metadata[image.id + getFileExt(image.image)] = {
				image : image.image,
				tags : tags,
				artist : artist ? artist[1] : "",
				description : image.description
			};
	
		}
		return metadata;
	}
	
	function getFileExt(str) {
		return str.match(/\.\w+$/)[0];
	}
	
	function insertButton() {
		var navBar = document.getElementsByClassName("flex__right")[0];
		var button = document.createElement("a");
		button.href = "#";
		button.innerText = "Metadata";
		navBar.insertBefore(button, navBar.firstChild);
	
		button.addEventListener("click", function() {
			getAllFavorites(function (images) {
				var metadata = parseImageData(images);
				document.write(JSON.stringify(metadata, null, 4));
			});
		});
	}
	
	insertButton();
	
	})();
	