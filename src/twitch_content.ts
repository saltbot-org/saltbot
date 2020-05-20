import { elementReady } from "./es6-element-ready";

function addListener(): void {
	elementReady(".chat-list").then((element: Element) => {
		// put a mutation observer on the chat which reports back to the main content script whenever Waifu speaks
		const chatWindow = element;
		const oldWaifuMessages: string[] = [];
		const observer = new MutationObserver(function () {

			const chatLines = chatWindow.querySelectorAll(".chat-line__message");
			const Waifu4uLines: string[] = [];
			chatLines.forEach(function (chatLine: Element) {
				const from = chatLine.querySelector(".chat-author__display-name").textContent;

				if (from.toUpperCase() === "WAIFU4U") {
					const message = chatLine.querySelector("span[data-a-target='chat-message-text'],a[data-a-target='chat-line__message--link'],a.ffz-tooltip").textContent;

					if (!oldWaifuMessages.includes(message)) {
						oldWaifuMessages.push(message);
						Waifu4uLines.push(message);
					}

				}
			});

			// at this point, we've captured input from Waifu
			for (const line of Waifu4uLines) {
				chrome.runtime.sendMessage({
					message: line,
				}, function () {
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
}

let triggered = false;
document.onreadystatechange = function (): void {
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

//make sure that the chat was properly loaded after 10 seconds, otherwise reload
setTimeout(() => {
	if ($("div[data-a-target='chat-welcome-message']").length === 0) {
		//welcome message was not found, reload the page
		window.location.reload(true);
	}
}, 20000);

//reload every hour
setTimeout(function () {
	window.location.reload(true);
}, 3600000);
