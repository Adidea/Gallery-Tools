// ==UserScript==
// @name        FA Gallery Scraper
// @namespace   Artex
// @description Retrieves the sources to the submissions in a gallery
// @include     https://www.furaffinity.net/favorites/*
// @include     https://www.furaffinity.net/scraps/*
// @include     https://www.furaffinity.net/gallery/*
// @include     http://www.furaffinity.net/favorites/*
// @include     http://www.furaffinity.net/scraps/*
// @include     http://www.furaffinity.net/gallery/*
// @run-at      document-end
// @version     1.1
// @homepage     https://www.furaffinity.net/user/artex./
// @grant       none
// ==/UserScript==

/*
Notes to self:
- restructure and clean up code to make it possible to scrape galleries on other websites.
- handle bad requests - done, but largely untested.
- look into saving images to disk - doesn't look to be very do-able without making an extension.
- add a pause/resume button (easy enough)
- current method of writing to output could become slow with large galleries.
*/

//all these globals... I should fix that.
var sources = null;
var submissions = [];
var failed = [];
var debugEnabled = false;
var downloadPages = [1,1]; //ex:1,5 pages 1-5.
var pageNum = downloadPages[0]; //current page downloading
var submissionsComplete = 0; //number submissions downloaded.
var currentPage; //gallery document being scraped
var downloadAll = false;
var downloadMetadata = false;
var startMode = true; //toggles behavior of start button.
var menuOpen = false;

var masterDiv = null;

function resetGlobals() {
  sources = null;
  submissions = [];
  failed = [];
  downloadPages = [1,1]; //ex:1,5 pages 1-5.
  pageNum = downloadPages[0]; //current page downloading
	submissionsComplete = 0; //number submissions downloaded.
  currentPage = undefined; //gallery document being scraped
  downloadAll = false;
  startMode = true; //toggles behavior of start button.
	downloadMetadata = false;
  menuOpen = false;
}

function log() {
    if (debugEnabled === true) {
        console.log.apply(console, arguments);
    }
}
//sets the status text of the scraping processs.
/*
function setStatus(str) {
  var statusText = masterDiv.querySelector("#statusText");
  if (statusText !== null) {
    statusText.textContent = str;
  } else {
    log("attempt to set status without statusText");
  }
}
*/

/*
function setProgress(percent) {
  var statsFill = masterDiv.querySelector("#statusFill");
  statusFill.style.width = (100*percent)+"%";
}
*/
/*
function writeToOutput(source, json) {
  var output = masterDiv.querySelector("#output");
  if (json) {
    output.textContent = JSON.stringify(source, null, 4);
  } else {
    output.textContent = source;
  }
  output.scrollTop = output.scrollHeight;
}
*/
//Gets all submissions displayed on currentPage and returns array of urls.
/*
function getSubmissions() {
  var thumbnails = currentPage.getElementsByClassName("t-image");
  for (var i=0; i < thumbnails.length; i++) {
    var page = thumbnails[i].getElementsByTagName("a")[0];
    if (page !== undefined && page.href !== undefined) {
      submissions[(submissions.length-1) + 1] = page.href;
    }
  }
  return submissions;
}
*/
/*
//retrieves the submission image url from the submission page document.
function getSubmissionSource(page){
  var controlBar = page.getElementsByClassName("button submission rounded");
  for (var i=0; i < controlBar.length; i++) {
   var link = controlBar[i].getElementsByTagName("a")[0];
    if (link !== undefined && link.textContent == "Download") {
      return link.href;
    }
  }
}
*/
/*
function getTagsFromSubmission(page) {
	var tags = [];
	var tagEl = page.getElementsByClassName("tags");
	for (i = 0; i < tagEl.length; i++) {
	  tags[i] = tagEl[i].firstChild.textContent;
	}
	//also collect category, species, and gender info
	var categoryTagEl = page.getElementsByClassName("tags-row")[0].firstElementChild;
	var categoryTagsList = categoryTagEl.getElementsByTagName("strong");
  var category = [];
	for (i = 0; i < categoryTagsList.length; i++) {
		var categoryTitle = categoryTagsList[i].textContent;
		var categoryTag = categoryTagsList[i].nextSibling.textContent
		category[i] = categoryTitle + categoryTag.replace("|", "");
	}
  //get rating
  var rating = "Rating: " + page.getElementsByClassName("rating-box")[0].textContent.replace("\n","");
  category.push(rating);
	return [tags, category];
}
*/

function retryFailed() {
  fetchPage(failed.slice(), 0, sources);
  failed = [];
}

function downloadComplete() {
  if (failed.length > 0) {
    setStatus("Retrying failed submissions,");
    window.setTimeout(retryFailed, 3000);
  } else {
    if (downloadMetadata) {
      writeToOutput(sources, true);
    } else {
      writeToOutput(sources.join("\n"));
    }
    setStatus("Done");
  }
}

//requests submission pages and adds submission url to collector array
function fetchPage(submissions, num, collector) {
  //mysterious undefined variable being appended to the end of the array
	collector = collector || (downloadMetadata ? {} : []);
  log("subssss:", submissions[num]);
  if (submissions[num] !== undefined) {
    var xhr = new XMLHttpRequest();

    xhr.addEventListener("loadend", function() {
      if (startMode === true) {
        setStatus("Cancelled");
        if (downloadMetadata) {
          writeToOutput(sources, true);
        }
        return;
      }
      if (xhr.status == 200) { //Ok
        var page = this.responseXML;
        var source = getSubmissionSource(page);
				if (downloadMetadata === true) {
					var tags = getTagsFromSubmission(page);
					var fileName = source.match(/[^\/]+$/)[0];
					source = {
						image : source,
						submission : submissions[num], //could provide id or url. using url for now.
						tags : tags[0],
            category : tags[1],
						artist : source.match(/art\/([^\/]+)\//)[1],
            description : page.getElementsByClassName("p20")[0].textContent,
					}
					log(fileName);
					collector[fileName] = source;
				} else {
					collector[num] = source;
					//submissionsComplete = submissionsComplete + 1;
				}
				setStatus("Getting Submission Source:" + num + "/" + submissions.length);
				setProgress(num/submissions.length);

				var end = false;
				if (num < submissions.length) {
					end = true;
					fetchPage(submissions, ++num, collector);
				}

        if (downloadMetadata) {
          writeToOutput(source.image);
        } else {
          writeToOutput(collector.join("\n"));
        }
      } else { //bad request, add to fail list D:
        setStatus("Request Failed: " + submissions[num]);
        failed[(failed.length-1)+1] = submissions[num];
      }
      if ((num + 1) >= submissions.length) {
        sources = collector;
        downloadComplete();
      }
    });
    //log("GET:", submissions[num], num);
    xhr.open("GET", submissions[num]);
    xhr.responseType = "document";
    xhr.send();
  }
}

//returns true if 'no-images' is found on page
function isLastPage(page) {
  var noImages = page.getElementById("no-images");
  if (noImages === null) {
    return false;
  } else {
    return true;
  }
}

function getGallerySubmissions() {
  if (pageNum < (+downloadPages[1] + 1)) {
    var url = window.location.href;
    var pageNumURL = url.match(/(\/\d+\/*)$/);
    var nextPage = "";
    if (pageNumURL === null) {
      nextPage = url + pageNum;
    } else {
      nextPage = url.replace(/(\/\d+\/*)$/, "/" + pageNum);
    }
    log("Next Page:", nextPage);
    if (startMode === true) {
      log("cancelled page scrape");
      setStatus("Cancelled");
      return;
    }
    setStatus("Scraping page: " + pageNum + "/" + (downloadAll ? "?" : downloadPages[1]));
    if (downloadAll === false) {
      setProgress(pageNum/downloadPages[1]);
    }
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("loadend", function() {
      if (xhr.status === 200) { //Ok
        currentPage = this.responseXML;
        //got all submission links, start getting sources
        if (isLastPage(currentPage) === true) {
          log("submissions found:", submissions.length);
          fetchPage(submissions, 0, sources);
          return;
        }
        pageNum = +pageNum + 1;
        getSubmissions();
        writeToOutput(submissions.join("\n"));
        getGallerySubmissions();
      } else { //bad request, try again.
        setStatus("Failed to get page "+pageNum+" trying again in 5 seconds.");
        window.setTimeout(getGallerySubmissions(), 5000);
      }
    });
    xhr.open("GET", nextPage);
    xhr.responseType = "document";
    xhr.send();

  } else {
    //done
    log("")
    log("pageNum:", pageNum);
    log("submissions found:", submissions.length);
    fetchPage(submissions, 0, sources);
    log("really");
  }
}

//experimental download function (doesn't work)
function downloadLinksFromOutput() {
  var output = masterDiv.querySelector("#output");
  var links = output.getElementsbyTagName("a");
  for (var i = 0; i < links.length; i++) {
    links[i].click();
  }
}

//recursively scrapes gallery pages list and runs the show.
function scrapeGallery() {
  getGallerySubmissions();
}

//THE UI CODE ¯\_(ツ)_/¯

// initiates the download menu
function downloadMenu() {
  masterDiv = document.createElement("div"); //div master race
  masterDiv.setAttribute("id","Master");
  var style = document.createElement("style");
  style.setAttribute("scoped","");
  var subjects = [ //masterDiv's 'loyal' subjects
    '<div id="title">Download Gallery <div id="close">✕</div></div>',
    '<div class="divide"></div>',
    '<div id="pages">',
    ' <label for="pageInput">Pages:</label>',
    ' <input type="number" id="pageStart"> to <input type="number" id="pageEnd">',
    ' <input type="checkbox" id="allPages"><label for="allPages"> All Pages</label>',
    '</div>',
    '<input type="button" id="start" value="Start Download">',
		'<input type="checkbox" id="metadata"><label for="metadata"> Metadata</label>',
  ];
  var css = [
    '#Master {',
    '  position: fixed;',
    '  top: 50%;',
    '  left: 50%;',
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
  masterDiv.innerHTML = subjects.join("");
  style.innerHTML = css.join("");
  document.body.appendChild(masterDiv);
  masterDiv.appendChild(style);

  // hook up buttons and input

  var closeWindow = masterDiv.querySelector("#close");
  var pageStart = masterDiv.querySelector("#pageStart");
  var pageEnd = masterDiv.querySelector("#pageEnd");
  var allPages = masterDiv.querySelector("#allPages");
	var metadataButton = masterDiv.querySelector("#metadata");
  var start = masterDiv.querySelector("#start");

  closeWindow.addEventListener("click", function() {
    document.body.removeChild(masterDiv);
    resetGlobals();
    masterDiv = null;
  });
  //update downloadPages
  pageStart.addEventListener("input", function() {
    downloadPages[0] = pageStart.value;
    pageNum = downloadPages[0];
  });
  pageEnd.addEventListener("input", function() {
    downloadPages[1] = pageEnd.value;
    log(downloadPages[1])
  });
  //disable other inputs and prepare downloader to incrementally grab pages until end of gallery
  allPages.addEventListener("click", function(){
    var bool = allPages.checked;
    if (bool == true) {
      pageStart.setAttribute("disabled", "");
      pageEnd.setAttribute("disabled", "");
      downloadPages = [1,99999]; //will stop when end of gallery is found.
      downloadAll = true;
    } else {
      pageStart.removeAttribute("disabled");
      pageEnd.removeAttribute("disabled");
      downloadPages = [pageStart.value, pageEnd.value];
      downloadAll = false;
    }
  });

	//Get tags, submission page, and submission file in JSON format.
	metadataButton.addEventListener("click", function() {
		downloadMetadata = metadataButton.checked;
	});

  start.addEventListener("click", function() {
    if (startMode === true) { //start download
      var statusDiv = masterDiv.querySelector("#status");
      if (statusDiv === null) {
        statusDiv = document.createElement("div");
        statusDiv.setAttribute("id", "status");
        var html = [
          '<span id="statusText">status</span>',
          '<div id="statusBar">',
          ' <div id="statusFill" width=0></div>',
          '</div>',
          '<textarea id="output" spellcheck="false" wrap="off" readonly style="background-color: rgba(195, 195, 195, 0.51) ! important;"></textarea>'
        ];
        statusDiv.innerHTML = html.join("");
        masterDiv.appendChild(statusDiv);
      }
      start.setAttribute("value", "Stop Download");
      startMode = false;
      scrapeGallery();
    } else { // stop download
      resetGlobals()
      downloadPages = [pageStart.value, pageEnd.value];
      downloadAll = allPages.checked;
      start.setAttribute("value", "Start download");
    }
  });
}

function insertButton() {
  var insertAt = document.getElementsByClassName("page-options")[0] || document.getElementsByClassName("bg2")[0];

  var button = document.createElement("input");
  button.type = "button";
  button.style.float = "right";
  button.value = "Download Gallery";
  log(insertAt)
  insertAt.appendChild(button);

  button.addEventListener("click", function() {
    if (menuOpen === false) {
      downloadMenu();
      menuOpen = true;
    }
  });
}

insertButton();
