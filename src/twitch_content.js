if (window.location.href == "http://www.twitch.tv/saltybet") {
	var doEverything = function() {
		// remove the video window
		var killVideo=function() {
			var parent = document.getElementsByClassName("ember-view full")[0];
			while (parent.childNodes.length > 0) {
				parent.removeChild(parent.childNodes[0]);
			}
		};
		killVideo();
		setTimeout(killVideo, 20000);

		// put a mutation observer on the chat which reports back to the main content script whenever Waifu speaks
		var chatWindow = document.getElementsByClassName("scroll chat-messages js-chat-messages")[0];
		if (chatWindow === undefined)
			chatWindow = document.getElementById("right_col");
		var oldWaifuMessages = [];
		var observer = new MutationObserver(function(mutations) {

			var chatLines = chatWindow.getElementsByClassName("ember-view chat-line");
			var Waifu4uLines = [];
			for (var i = 0; i < chatLines.length; i++) {

				var line = chatLines[i];
				var from = line.getElementsByClassName("from")[0].innerHTML;

				if (from == "Waifu4u") {

					var message = line.getElementsByClassName("message")[0].innerHTML;
					if (oldWaifuMessages.indexOf(message) == -1) {
						oldWaifuMessages.push(message);
						Waifu4uLines.push(message);
					}

				}

			}

			// at this point, we've captured input from Waifu
			for (var j = 0; j < Waifu4uLines.length; j++) {
				chrome.runtime.sendMessage({
					message : Waifu4uLines[j]
				}, function(response) {
					console.log("response received in twitch content");
				});
				console.log("-\nnew message from Waifu:\n" + Waifu4uLines[j]);
			}
			observer.takeRecords();
		});
		observer.observe(chatWindow, {
			subtree : true,
			childList : true,
			attributes : true
		});
	};
	
	window.onload = function() {
		if (document.getElementsByClassName('ember-view full').length == 0) {
			$(document).on('DOMNodeInserted', function(e) {
				if (e.target.className == 'ember-view full') { 
					doEverything();
				}
			});
		}
		else {
			doEverything();
		}
	};
}
