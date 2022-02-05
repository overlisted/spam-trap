require("dotenv").config();

const { Client, Intents, Permissions, MessageEmbed } = require("discord.js");
const { MongoClient } = require("mongodb");

const main = async () => {
  const mongoClient = new MongoClient(process.env.MONGO_URL);
  const discord = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

  console.info("Connecting to Mongo");
  await mongoClient.connect();
  const db = mongoClient.db("spam-trap");
  const guildsColl = db.collection("guilds");

  discord.on("ready", () => {
    console.info(`Logged in as ${discord.user.tag}`);
  });

  discord.on("messageCreate", async msg => {
    if(!msg.inGuild()) return;

    const entry = await guildsColl.findOne({ guildId: msg.guildId });

    if(entry) {
      if(entry.trapChannel === msg.channelId) {
        if(!msg.member.bannable) return;

        try {
          const dm = await msg.author.createDM();
          await dm.send(entry.banMsg);
        } catch {}

        await msg.member.ban({ days: 1, reason: "Sent a message in the trap channel" });

        if(entry.logChannel) {
          try {
            const logs = await discord.channels.fetch(entry.logChannel);
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

      await guildsColl.updateOne(
        { guildId: interaction.guildId },
        {
          $set: {
            guildId: interaction.guildId,
            trapChannel: interaction.options.getChannel("channel").id,
            banMsg: interaction.options.getString("ban_msg"),
          },
        },
        { upsert: true },
      );

      await interaction.reply("Saved!");
    }

    if(interaction.commandName === "logs") {
      if(!interaction.memberPermissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await interaction.reply(`You need the "Ban members" permission to use this.`);

        return;
      }

      await guildsColl.updateOne(
        { guildId: interaction.guildId },
        {
          $set: {
            guildId: interaction.guildId,
            logChannel: interaction.options.getChannel("channel").id,
          },
        },
        { upsert: true },
      );

      await interaction.reply("Saved!");
    }
  });

  console.info("Logging into the bot account");
  await discord.login(process.env.TOKEN);
};

main().catch(e => console.error(e));
