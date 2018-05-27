(function($) {

	/**
	 * @function
	 * @property {object} jQuery plugin which runs handler function once specified element is inserted into the DOM
	 * @param {function} handler A function to execute at the time when the element is inserted
	 * @param {bool} shouldRunHandlerOnce Optional: if true, handler is unbound after its first invocation
	 * @example $(selector).waitUntilExists(function);
	 */
	($.fn as any).waitUntilExists = function(handler, shouldRunHandlerOnce, isChild) {
		const found = "found";
		const $this = $(this.selector);
		const $elements = $this.not(function() {
			return $(this).data(found);
		}).each(handler).data(found, true);

		if (!isChild) {
			((window as any).waitUntilExists_Intervals = (window as any).waitUntilExists_Intervals || {})[this.selector] =
				window.setInterval(function() {
					($this as any).waitUntilExists(handler, shouldRunHandlerOnce, true);
				}, 500)
			;
		} else if (shouldRunHandlerOnce && $elements.length) {
			window.clearInterval((window as any).waitUntilExists_Intervals[this.selector]);
		}

		return $this;
	};

}(jQuery));

let addListener = function() {
	($(".chat-list__lines") as any).waitUntilExists(function() {
		// put a mutation observer on the chat which reports back to the main content script whenever Waifu speaks
		const chatWindow = $(".chat-list__lines")[0];
		const oldWaifuMessages = [];
		const observer = new MutationObserver(function(mutations) {

			const chatLines = $(chatWindow).find(".chat-line__message");
			const Waifu4uLines = [];
			chatLines.each(function(index, element) {
				const from = $(this).find(".chat-author__display-name")[0].innerText;

				if (from.toUpperCase() === "WAIFU4U") {
					const message = $(this).find("span[data-a-target='chat-message-text'],a[data-a-target='chat-line__message--link'],a.ffz-tooltip").text();

					if (oldWaifuMessages.indexOf(message) === -1) {
						oldWaifuMessages.push(message);
						Waifu4uLines.push(message);
					}

				}
			});

			// at this point, we've captured input from Waifu
			for (const line of Waifu4uLines) {
				chrome.runtime.sendMessage({
					message: line,
				}, function(response) {
					//console.debug("response received in twitch content");
				});
				console.log("-\nnew message from Waifu:\n" + line);
			}
			observer.takeRecords();
		});
		observer.observe(chatWindow, {
			attributes: true,
			childList: true,
			subtree: true,
		});
	});
};

let triggered = false;
document.onreadystatechange = function() {
	if (document.readyState === "complete") {
		triggered = true;
		addListener();
	}
};

if (!triggered && document.readyState === "complete") {
	//site was already loaded when the script activated
	triggered = true;
	addListener();
}

//reload every hour
setTimeout(function() {
	window.location.reload(true);
}, 3600000);
