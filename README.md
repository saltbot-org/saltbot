# SaltBot ![Build](https://github.com/saltbot-org/saltbot/workflows/Build/badge.svg)  [![CodeFactor](https://www.codefactor.io/repository/github/saltbot-org/saltbot/badge)](https://www.codefactor.io/repository/github/saltbot-org/saltbot)  [![DeepScan grade](https://deepscan.io/api/teams/8156/projects/10312/branches/141011/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=8156&pid=10312&bid=141011)  [![GitHub issues](https://img.shields.io/github/issues/saltbot-org/saltbot?style=plastic)](https://github.com/saltbot-org/saltbot/issues)  [![GitHub stars](https://img.shields.io/github/stars/saltbot-org/saltbot?style=plastic)](https://github.com/saltbot-org/saltbot/stargazers)  [![GitHub forks](https://img.shields.io/github/forks/saltbot-org/saltbot?style=plastic)](https://github.com/saltbot-org/saltbot/network)

A betting bot for [SaltyBet.com](http://saltybet.com)

* Read about it [**here**](http://explosionduck.com/wp/story-of-a-betting-bot/) and learn how to use it [**here**](http://explosionduck.com/wp/so-you-want-to-use-saltbot/). 
* Download sample data(match record and chromosome) above or [**click here.**](https://github.com/saltbot-org/saltbot/tree/master/data/2020-01-27)
* Download the app from the Chrome Store [**here**](https://chrome.google.com/webstore/detail/saltbot/bholoegapebhflljekancpcnajigaiih).

# System Requirements
**Minimum Specs:**
* Dual core processor 1.5Ghz+
* 4gb DDR3 RAM 1333mhz

**Recommended Specs:**
* Quad Core processor 3.0Ghz+
* 8gb DDR3 RAM 1600mhz

# Installing latest version(Chrome/Chromium)

To install the git version of this extension:
* Clone the repo:  
`git clone https://github.com/saltbot-org/saltbot.git`
* **Make sure you have Latest Node.js installed.** It is available at https://nodejs.org/en/download/
* For Ubuntu/Linux Mint Users [Follow this guide to install Nodejs ver. 14.x](https://github.com/nodesource/distributions/blob/master/README.md#debinstall) and be sure npm is installed  
`sudo apt install npm`
* Open the command line and go to the base of the project where the file package.json is located
* Run  
`npm install && npm run build`
* Open chrome extension settings and enable developer mode
* Click "load unpacked extension"
* Navigate to the '/dist/' folder and load it
* Import the data and chromosome files
* Select your preferred mode and settings and let it run.

# Updating

To keep your version up to date simply:
* Run `git pull`
* Run `npm install && npm run build`
* Open Chrome Extension settings and click "reload" on Saltbot
* Reload saltybet.com and the twitch chat tab

# Bug Reports

Please be sure to [**Read the bug reporting guide**](https://github.com/saltbot-org/saltbot/blob/master/bugreports.md) before you [**submit a bug report!**](https://github.com/saltbot-org/saltbot/issues/new)

The more info you provide, the better we can diagnose the issue and remedy it. 

# Screenshot

<img src="/dist/images/screenshot.png" />

# Subreddit

[**We have a subreddit for saltbot now at /r/saltbot**](https://www.reddit.com/r/saltbot/). Use this for extensive discussions of saltbot's features, improvements, strategy, etc.

# Twitch Channel

[**We now have a twitch channel where you can see the bot running live**,](https://twitch.tv/saltbot) be sure to swing by and follow!

# Contributors & Members

[**Click here for the current list of Contributors and Members**](https://github.com/saltbot-org/saltbot/network/members)
