#!/usr/bin/python
# Welcome to CLRenew, a simple python script that automates mouse clicks to
# renew craigslist postings credit to https://github.com/yuqianli for base code
import pyautogui
import os
import subprocess
# Set a counter to count the # of exceptions occur
counter = 0
# Start the while loop
while True:
    try:
        pyautogui.time.sleep(2)
        loginButtonLocationX, loginButtonLocationY  = pyautogui.locateCenterOnScreen('login.png')
        pyautogui.moveTo(loginButtonLocationX, loginButtonLocationY)
        pyautogui.click()
        pyautogui.time.sleep(2)


# Exception handle when pyautogui can't locate the login button on the screen
# or if it clicks away by mistake
# this section needs work and sometimes fails to function properly
    except Exception:
        print ("Exception thrown, calculating course of action")
        counter += 1
        try:
            pyautogui.time.sleep(2)
            logoutButtonLocationX, logoutButtonLocationY  = pyautogui.locateCenterOnScreen('logout.png')
            print ("You are logged in, nothing to do")
            print ("counter =" + str(counter))
            if counter >= 6: counter = 0
else:
pyautogui.keyDown('alt')
pyautogui.press('f4')
pyautogui.keyUp('alt')
rc = subprocess.call("saltbot.sh")
