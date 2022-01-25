require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes, ApplicationCommandOptionType } = require("discord-api-types/v9");
const { writeFile } = require("fs/promises");

const commands = [
  {
    name: "trap",
    description: "Configures the bot",
    options: [
      {
        name: "channel",
        description: "The trap channel in this server",
        type: ApplicationCommandOptionType.Channel,
        required: true,
      },
      {
        name: "ban_msg",
        description: "The message that will be sent to banned people",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "logs",
    description: "Configures the log channel",
    options: [
      {
        name: "channel",
        description: "The log channel in this server",
        type: ApplicationCommandOptionType.Channel,
        required: true,
      },
    ],
  },
];

const main = async () => {
  const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

  try {
    console.log("=> Slash commands");

    await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: commands },
    );
  } catch(error) {
    console.error(error);
  }

  console.log("=> Config file");
  await writeFile("config.json", "{}");
  await writeFile("logConfig.json", "{}");
};

main();
