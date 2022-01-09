require("dotenv").config();

const { Client, Intents } = require("discord.js");
const { open } = require("fs/promises");

const main = async () => {
  console.info("Reading the configs");
  const configFd = await open("config.json", "r+");
  const config = JSON.parse(await configFd.readFile());

  const discord = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES] });

  discord.on("ready", () => {
    console.info(`Logged in as ${discord.user.tag}`);
  });

  discord.on("messageCreate", async msg => {
    if(!msg.inGuild()) return;

    const entry = config[msg.guildId];

    if(entry) {
      if(entry.channel === msg.channelId) {
        try {
          const dm = await msg.author.createDM();
          await dm.send(entry.banMsg);

          await msg.member.ban({days: 1, reason: "Sent a message in the trap channel"});
          await msg.delete();
        } catch {}
      }
    }
  });

  discord.on("interactionCreate", async interaction => {
    if(!interaction.isCommand()) return;

    if(interaction.commandName === "trap") {
      config[interaction.guildId] = {
        channel: interaction.options.getChannel("channel").id,
        banMsg: interaction.options.getString("ban_msg"),
      }

      await configFd.write(JSON.stringify(config), 0);
      await interaction.reply("Saved!");
    }
  })

  console.info("Logging into the bot account")
  await discord.login(process.env.TOKEN);
}

main().catch(e => console.error(e))