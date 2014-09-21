var btnClicked = function(clicktype) {
	chrome.tabs.query({
		active : true,
		currentWindow : true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			type : clicktype
		}, function(response) {
			console.log(response.farewell);
		});
	});
};

var drClick=function (){
	btnClicked("dr");
};
var prClick=function (){
	btnClicked("pr");
};
var erClick=function (){
	btnClicked("er");
};

document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("bdr").addEventListener("click", drClick);
	document.getElementById("bpr").addEventListener("click", prClick);
	document.getElementById("ber").addEventListener("click", erClick);
	document.getElementById("bir").addEventListener("click", function (){
		alert("function not set yet");
		
	});
});