#!/bin/bash

sleep 5

chromium-browser http://www.saltybet.com/authenticate?signin=1 & disown

sleep 5

python login.py & disown
