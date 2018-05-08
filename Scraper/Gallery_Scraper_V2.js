// ==UserScript==
// @name        FA Gallery Scraper 2
// @namespace   Artex
// @description Retrieves the sources to the submissions in a gallery
// @include     https://www.furaffinity.net/favorites/*
// @include     https://www.furaffinity.net/scraps/*
// @include     https://www.furaffinity.net/gallery/*
// @include     http://www.furaffinity.net/favorites/*
// @include     http://www.furaffinity.net/scraps/*
// @include     http://www.furaffinity.net/gallery/*
// @run-at      document-end
// @version     2.0
// @homepage     https://www.furaffinity.net/user/artex./
// @grant       none
// ==/UserScript==


/* TODO:
	- Rewrite paging
	- update targets for metadata
	- implement pause/stop
	- scrape new content option
*/

/* Options for keeping track of submissions last scraped.
	1.Find the last page and store page number and last submission in gallery.
		- on subsequent scrapes go to page number and incrementally
		check each page for last submisson until found.
		- number of pages checked = number of new pages to scrape from the beginning.
	2.store a list of the first few submissions in gallery from last scrape (backups incase one is deleted).
		- from page 1 incrementally check each page for a submission from that list
		while collecting all the submissions on the page.
		-Stop when a submission is found.

*/
var settings = {
	pages: [0, 0],
	downloadAll: false,
	startFromLastSession: false,
	downloadMetadata: false,
}

var request = {
	failed: [],
	get: function(url, callback) {
		var req = this;
		var xhr = new XMLHttpRequest();
		xhr.addEventListener("loadend", function() {
			if (xhr.status === 200) {
				callback(this.responseXML);
			} else { //need to figure out if FA gives out a specific code for too many requests.
				req.fail(url);
			}
		});
		xhr.open("GET", url);
		xhr.responseType = "document";
		xhr.send();
	},
	fail: function(url) {
		failed.push(url);
	}
}

var gallery = {
	url: "", //gallery being scraped
	links: [], //submission urls
	sources: [] //submission image urls
}

gallery.page = {
	number: 0,
	getLinks: function(page) {
		var pageHtml = currentPage.documentElement.innerHTML;
		var regExDownloadLink = /<a href="(\/view\/(.+?)\/)">/g;
		var submissionLinks;
		var links = [];
		while ((submissionLinks = regExDownloadLink.exec(pageHtml)) !== null) {
			links.push(submissionLinks[1]);
		}
		return links;
	},
	isLast: function(page) {
		var noImages = document.querySelector(".pagination .button.right.inactive");
		if (noImages === null) {
			return false;
		} else {
			return true;
		}
	},
	baseURL : function(url) { //returns [base url (no page number), gallery type (gallery, favorites, scraps)]
		return url.match("https?:\/\/www\.furaffinity\.net\/(gallery|favorites|scraps)\/[^\/]+\/");
	}
}

gallery.submission = {
	getSource: function(submission) {
		var download = submission.querySelector(".download-logged-in");
		return download.href;
	},
	getTags: function(submission) {
		var tags = [];
		var tagEl = page.getElementsByClassName("tags");
		for (i = 0; i < tagEl.length; i++) {
			tags[i] = tagEl[i].firstChild.textContent;
		}

		//also collect category, species, and gender info
		var categoryTagEl = page.getElementsByClassName("tags-row")[0].firstElementChild;
		var categoryTagList = categoryTagEl.getElementsByTagName("strong");
		var category = [];
		for (i = 0; i < categoryTagsList.length; i++) {
			var categoryTitle = categoryTagList[i].textContent;
			var categoryTag = categoryTagList[i].nextSibling.textContent
			category[i] = categoryTitle + categoryTag.replace("|", "");
		}

		//get rating
		var rating = "Rating: " + page.getElementsByClassName("rating-box")[0].textContent.replace("\n", "");
		category.push(rating);

		return [tags, category];
	}
}

var ui = {
	create: function() {
		//create ui
		var html = [
			'<div id = "Master">',
			'	<div id="title">Download Gallery <div id="close">✕</div></div>',
			'	<div class="divide"></div>',
			'	<div id="pages">',
			'		<label for="pageInput">Pages:</label>',
			'		<input type="number" id="pageStart"> to <input type="number" id="pageEnd">',
			' 	<input type="checkbox" id="allPages"><label for="allPages"> All Pages</label>',
			'	</div>',
			'	<input type="button" id="start" value="Start Download">',
			'	<input type="checkbox" id="metadata"><label for="metadata"> Metadata</label>',
			' <div id="status">',
			' <span id="statusText">status</span>',
			' <div id="statusBar">',
			'  <div id="statusFill" width=0></div>',
			' </div>',
			' <textarea id="output" spellcheck="false" wrap="off" readonly style="background-color: rgba(195, 195, 195, 0.51) ! important;"></textarea>',
			' </div>',
			'</div>',
		];

		//TODO: rename selectors to avoid collisions
		var css = [
			'#Master {',
			'  position: fixed;',
			'  top: 50%;',
			'  left: 50%;',
			'	 min-width: 450px;',
			'  transform: translate(-50%, -50%);',
			'  display: inline-block;',
			'  z-index: 999;',
			'  background-color: rgba(255, 255, 255, 0.9);',
			'  padding: 20px;',
			'  color: #4D4D4D;',
			'  font-family: "segoe ui";',
			'  transition: height 0.3s;',
			'  -webkit-transition: height 0.3s;',
			'}',
			'#title {',
			' position: relative;',
			'  text-align: center;',
			'  width: 100%;',
			'  top: -10px;',
			'}',
			'#close {',
			'  float: right;',
			'}',
			'#close:hover {',
			'  cursor: pointer;',
			'}',
			'.divide {',
			'  border-bottom: 1px solid rgba(200,200,200, 0.5);',
			'  width: 100%;',
			'  margin-bottom: 10px;',
			'}',
			'#start {',
			'  display: block;',
			'  margin: 0 auto;',
			'  margin-top: 10px;',
			'}',
			'#metadata {',
			'	/*float: left;*/',
			'}',
			'#statusBar {',
			' width: 100%;',
			' height: 25px;',
			' background-color: rgba(200,200,200,0.5);',
			' margin-bottom: 5px;',
			'}',
			'#statusText {',
			' text-align: center;',
			'}',
			'#statusFill {',
			' transition: width 0.2s;',
			' -webkit-transition: width 0.2s;',
			' height: 100%;',
			'	width: 0;',
			' background-color: #4DA9B9;',
			'}',
			'#output {',
			' width: 100%;',
			' max-width: 800px;',
			' height: 200px;',
			' overflow: scroll;',
			' border-radius: 0 !important;',
			' color: #4D4D4D;',
			' background-color: rgba(200,200,200,0.5) !important;',
			'}'
		];

		//insert html/css
		var container = document.createElement("div");
		container.setAttribute("id", "Master");
		container.innerHTML = html.join("");
		document.body.appendChild(container);
    html = container

		var style = document.createElement("style");
		style.setAttribute("scoped", "");
		style.innerHTML = css.join("\n");
		html.appendChild(style);

		var downloadUI = {
			elements: {
				master: html,
				pageStart: html.querySelector("#pageStart"),
				pageEnd: html.querySelector("#pageEnd"),
				allPages: html.querySelector("#allPages"),
				metadataButton: html.querySelector("#metadata"),
				start: html.querySelector("#start"),
				status: html.querySelector("#statusText"),
				statusFill: html.querySelector("#statusFill"),
				output: html.querySelector("#output"),
				closeWindow: html.querySelector("#close"),
			}
		}

		downloadUI.setProgress = function(current, min, max) {
			this.elements.statusFill.style.width = 100 * (current / (max - min)) + "%";
		}
		downloadUI.writeToOutput = function(str, json) {
			if (json) { //seems like I could move json logic outside function
				this.elements.output.textContent = JSON.stringify(str, null, 4);
			} else {
				this.elements.output.textContent = str;
			}
		}
		downloadUI.setStatus = function(str) {
			this.elements.status.textContent = str;
		}
		downloadUI.close = function() {
			document.body.removeChild(this.elements.master);
			download.menu = null;
		}
		downloadUI.connectEvents = function() {
			//buttons buttons buttons
			var ui = this
			ui.elements.closeWindow.addEventListener("click", function() {
				ui.close();
			});
			//update settings.pages
			ui.elements.pageStart.addEventListener("input", function() {
				settings.pages[0] = ui.elements.pageStart.value;
			});
			ui.elements.pageEnd.addEventListener("input", function() {
				settings.pages[1] = ui.elements.pageEnd.value;
			});
			//disable other inputs and prepare downloader to incrementally grab pages until end of gallery
			ui.elements.allPages.addEventListener("click", function() {
				var bool = ui.elements.allPages.checked;
				if (bool == true) {
					ui.elements.pageStart.setAttribute("disabled", "");
					ui.elements.pageEnd.setAttribute("disabled", "");
					settings.pages = [1, 99999]; //will stop when end of gallery is found.
					settings.downloadAll = true;
				} else {
					ui.elements.pageStart.removeAttribute("disabled");
					ui.elements.pageEnd.removeAttribute("disabled");
					settings.pages = [ui.elements.pageStart.value, ui.elements.pageEnd.value];
					settings.downloadAll = false;
				}
			});

			//Get tags, submission page, and submission file in JSON format.
			ui.elements.metadataButton.addEventListener("click", function() {
				settings.downloadMetadata = ui.elements.metadataButton.checked;
			});

			//start Scraping
			ui.elements.start.addEventListener("click", function() {
				download.start();
				//replace with pause/stop buttons
			});

		}

		return downloadUI;
	}
}

//NOTE: retry failed requests
//split logic for gallery/scraps and favorites. Page navigation differs too much. Still need to present consistent scraping options though.
gallery.scrape = {
	fromStart : function(currentPage) {

	},
	pageRange : function(pageNum) {
		if (pageNum <= settings.pages[1]) {
			download.menu.setStatus("Scraping page: " + "/" + (settings.downloadAll ? "?" : settings.pages[1]));
			download.menu.setProgress(pageNum, settings.pages[0], settings.pages[1]);
			download.menu.writeToOutput(gallery.links.join("\n"));
	
			gallery.page.number = pageNum;
			var galleryPage = gallery.page.baseURL(gallery.url)[0];
			request.get(galleryPage + pageNum, function(page) {
				if (gallery.page.isLast(page) === false) {
					var submissionLinks = gallery.page.getLinks(page);
					gallery.links = gallery.links.concat(submissionLinks);
					gallery.pageRange(pageNum + 1);
				} else {
					gallery.pageRange(settings.pages[1] + 1); //kind of a roundabout hack to move onto next stage when downloading all pages... tired.
				}
			})
		} else { //stage 2 - scrape submissions
			gallery.scrapeSubmission(gallery.links, 0);
		}
	}

}

gallery.scrapeSubmission = function(submissions, num) {
	request.get(submissions[num], function(page) {
		download.menu.setStatus("Submission: " + num + "/" + gallery.links.length);
		download.menu.setProgress(num, 0, gallery.links.length);

		var source = gallery.submission.getSource(page);
		if (settings.downloadMetadata === true) {
			var tags = gallery.submission.getTags(page);
			var fileName = source.match(/[^\/]+$/)[0];
			var data = {
				image: source,
				submission: submissions[num],
				tags: tags[0],
				category: tags[1],
				artist: source.match(/art\/([^\/]+)\//)[1],
				description: page.getElementsByClassName("p20")[0].textContent,
			}
			gallery.sources[fileName] = data;
			if (submissions.length < num + 1) {
				download.menu.setStatus("Stringifying JSON - this can take some time with many submissions...");
				download.menu.writeToOutput(JSON.stringify(gallery.sources));
			}
		} else {
			gallery.sources.push(source);
			download.menu.writeToOutput(gallery.sources.join("\n")); //NOTE: consider an 'AppendToOutput' for efficiencies sake
		}

		if (submissions.length > num + 1) {
			gallery.scrapeSubmission(submissions, num + 1);
		} else {
			download.menu.setStatus("DONE");
		}
	})
}

var download = { //more like scraper controls?
	state: "stopped", //possible states: stopped, running, paused
	menu: null,
	start: function() {
		//NOTE: When scraping is completed set status before parsing data into json
		this.state = "running";
		gallery.page.number = settings.pages[0];
		gallery.scrapeGallery(gallery.page.number);
	},
	pause: function() {
		download.menu.setStatus("Paused...");
		//AINT NOBODY GOT TIME FOR THAT
	},
	stop: function() {
		download.menu.setStatus("Stopped");
		//AINT NO BREAKS ON THIS TRAIN
	}
}

function initialize() {
	var insertAt = document.getElementsByClassName("user-profile-options")[0] || document.getElementsByClassName('tab')[0];

	//insert download button on gallery pages
	var button = document.createElement("input");
	button.type = "button";
	button.value = "Download Gallery";
	var buttonCSS = [
        "height: 100%;",
        "background: none;",
        "font-size: inherit;",
        "border: none;",
        "color: inherit;",
        "font-family: inherit;",
        "padding: 0 15px;"
    ];
    button.setAttribute("style", buttonCSS.join(""));
	insertAt.appendChild(button);

	button.addEventListener("click", function() {
		if (download.menu == null) {
			download.menu = ui.create();
			download.menu.connectEvents();
		}
	});
}

initialize();

//TODO NEXT: Test and impliment Pause/Stop
