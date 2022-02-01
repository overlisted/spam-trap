# Discord spam trap
Discord bot that automatically bans someone if they speak in an admin-specified channel. Currently used in the Oh My Zsh Discord.

## Setup
[Add it to your server](https://discord.com/api/oauth2/authorize?client_id=929745810667753512&permissions=9220&scope=bot%20applications.commands)

Use the `/trap` command in order to set it up; `/logs` allows you to select a channel for the bot to report its bans.

Please note that many modern spambots write in the oldest channels first, so if you want to make the bot banned as fast as possible, make the selected channel the oldest.
