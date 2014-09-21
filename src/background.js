var btnClicked = function(clicktype, data) {
	data = data || null;
	chrome.tabs.query({
		active : true,
		currentWindow : true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			type : clicktype,
			text : data
		}, function(response) {
			console.log(response.farewell);
		});
	});
};

var drClick = function() {
	btnClicked("dr");
};
var prClick = function() {
	btnClicked("pr");
};
var erClick = function() {
	btnClicked("er");
};
var onFileRead = function(e) {
	var t = e.target.result;
	btnClicked("ir", t);
};
var irClick = function() {
	var file = document.getElementById('bir').files[0];
	var reader = new FileReader();
	reader.onload = onFileRead;
	reader.readAsText(file);
};

document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("bdr").addEventListener("click", drClick);
	document.getElementById("bpr").addEventListener("click", prClick);
	document.getElementById("ber").addEventListener("click", erClick);
	document.getElementById("bir").addEventListener("change", irClick);
}); 