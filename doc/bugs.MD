# How to File a Bug

I've noticed that some Salty Bettors find their way either to the Chrome Store Support Page, or here Github, because they have some trouble getting SaltBot working correctly. They are understandably frustrated because SaltBot seems to work for other people, but not them. Probably few of them have any experience with software development, and so most are unaware of what a bug report might look like. 

From the developer's perspective, I want to make sure this extension works for everyone, but some steps have to be followed in order to ensure that (A) I'm not chasing my tail, and (B) I have enough information to actually find the problem in the code.

## Step 1: Troubleshooting

If you're having any trouble with SaltBot, please make sure you follow these steps.

1. [Read the basic usage guide.](http://explosionduck.com/wp/so-you-want-to-use-saltbot/) 
2. The guide says it, but I'm going to repeat it here. Make sure you unzip the seed data file before trying to upload it.
3. Try disabling all other browser plug-ins. For reasons unknown to me, some other plug-ins seem to interfere with SaltBot. 
4. SaltBot opens a Twitch window as a part of its normal functioning. It needs that window open to record matches correctly. Don't close it.

## Step 2: Good Reporting

If you are using the extension correctly, and are still having some kind of trouble, you need to gather some data for me so that I have some chance of figuring out what the problem is. Saying, "X feature doesn't work" doesn't give me much to go on. So please tell me the following.

* **How can I reproduce the problem?** This is the most important bit of information you can give me. What were the exact steps you took before the problem occurred, in the most granular detail you can remember? If it didn't work from the get-go, tell me your setup procedure and environment. If it just stopped working, try to think about what may have changed, like browser version or settings. If I can't reproduce the problem, I can't even begin to try to fix it. 
* What error messages are shown in the developer console and the background window console? You can see the developer console by pressing F12. You can see the background window console by right clicking somewhere on the SaltBot UI, and selecting "Inspect Element". 
* Describe the problem in as much detail as you can.

Even if you do all this, I may not be able to pinpoint the exact problem. For example, the exact cause of the plug-in interference issue has eluded me thus far. I do my best in the time that I can devote to this. Please have patience and creativity.



