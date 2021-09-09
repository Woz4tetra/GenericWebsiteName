#!/bin/bash
echo "Starting genericwebsitename server!"

SESSION=genericwebsitename

tmux has-session -t $SESSION > /dev/null

if [ $? != 0 ]; then
    tmux new -s $SESSION -d
fi

tmux send -t $SESSION "cd /home/ben/GenericWebsiteName
npm start" ENTER




