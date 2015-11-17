(function ($) {

/**
* @function
* @property {object} jQuery plugin which runs handler function once specified element is inserted into the DOM
* @param {function} handler A function to execute at the time when the element is inserted
* @param {bool} shouldRunHandlerOnce Optional: if true, handler is unbound after its first invocation
* @example $(selector).waitUntilExists(function);
*/

$.fn.waitUntilExists    = function (handler, shouldRunHandlerOnce, isChild) {
    var found       = 'found';
    var $this       = $(this.selector);
    var $elements   = $this.not(function () { return $(this).data(found); }).each(handler).data(found, true);

    if (!isChild)
    {
        (window.waitUntilExists_Intervals = window.waitUntilExists_Intervals || {})[this.selector] =
            window.setInterval(function () { $this.waitUntilExists(handler, shouldRunHandlerOnce, true); }, 500)
        ;
    }
    else if (shouldRunHandlerOnce && $elements.length)
    {
        window.clearInterval(window.waitUntilExists_Intervals[this.selector]);
    }

    return $this;
}

}(jQuery));

if (window.location.href == "http://www.twitch.tv/saltybet") {
	window.onload = function() {
		// remove the video window
		$(".dynamic-player").waitUntilExists(function() {
			var parent = document.getElementsByClassName("dynamic-player")[0];
			while (parent.childNodes.length > 0) {
				parent.removeChild(parent.childNodes[0]);
			}
		});
		
		
		$(".scroll.chat-messages.js-chat-messages").waitUntilExists(function() {
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
		});
	};
}
