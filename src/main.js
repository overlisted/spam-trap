require("dotenv").config();

const { Client, Intents, Permissions, MessageEmbed } = require("discord.js");
const { open } = require("fs/promises");

const main = async () => {
  console.info("Reading the configs");
  const configFd = await open("config.json", "r+");
  const logConfigFd = await open("logConfig.json", "r+");

  const config = JSON.parse(await configFd.readFile());
  const logConfig = JSON.parse(await logConfigFd.readFile());

  const discord = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

  discord.on("ready", () => {
    console.info(`Logged in as ${discord.user.tag}`);
  });

  discord.on("messageCreate", async msg => {
    if(!msg.inGuild()) return;

    const entry = config[msg.guildId];
    const logEntry = logConfig[msg.guildId];

    if(entry) {
      if(entry.channel === msg.channelId) {
        if(!msg.member.bannable) return;

        try {
          const dm = await msg.author.createDM();
          await dm.send(entry.banMsg);
        } catch {}

        await msg.member.ban({ days: 1, reason: "Sent a message in the trap channel" });

        if(logEntry && logEntry.channel) {
          try {
            const logs = await discord.channels.fetch(logEntry.channel);
            await logs.send({
              embeds: [
                new MessageEmbed()
                  .setTitle("Someone was banned!")
                  .addField("Tag", msg.member.user.tag, true)
                  .addField("ID", msg.member.user.id, true)
                  .addField("Message", msg.content, false),
              ],
            });
          } catch(e) {
            console.error(e);
          }
        }
      }
    }
  });

  discord.on("interactionCreate", async interaction => {
    if(!interaction.isCommand()) return;

    if(interaction.commandName === "trap") {
      if(!interaction.memberPermissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await interaction.reply(`You need the "Ban members" permission to use this.`);

        return;
      }

      config[interaction.guildId] = {
        channel: interaction.options.getChannel("channel").id,
        banMsg: interaction.options.getString("ban_msg"),
      };

      const newData = JSON.stringify(config);
      await configFd.write(newData, 0);
      await configFd.truncate(newData.length);

      await interaction.reply("Saved!");
    }

    if(interaction.commandName === "logs") {
      if(!interaction.memberPermissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await interaction.reply(`You need the "Ban members" permission to use this.`);

        return;
      }

      logConfig[interaction.guildId] = {
        channel: interaction.options.getChannel("channel").id,
      };

      const newData = JSON.stringify(logConfig);
      await logConfigFd.write(newData, 0);
      await logConfigFd.truncate(newData.length);

      await interaction.reply("Saved!");
    }
  });

  console.info("Logging into the bot account");
  await discord.login(process.env.TOKEN);
};

main().catch(e => console.error(e));
