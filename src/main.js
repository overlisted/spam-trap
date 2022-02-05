require("dotenv").config();

const { Client, Intents, Permissions, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { MongoClient } = require("mongodb");

const logEmbed = (msg, user, revoked) => new MessageEmbed()
  .setTitle("Someone was caught!")
  .addField("Tag", user.tag, true)
  .addField("ID", user.id, true)
  .addField("Revoked", revoked ?? "No", true)
  .addField("Message", msg.content, false);

const main = async () => {
  const mongoClient = new MongoClient(process.env.MONGO_URL);
  const discord = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

  console.info("Connecting to Mongo");
  await mongoClient.connect();
  const db = mongoClient.db("spam-trap");
  const guildsColl = db.collection("guilds");
  const bansColl = db.collection("bans");

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

        let logMessage;
        if(entry.logChannel) {
          try {
            const logs = await discord.channels.fetch(entry.logChannel);
            logMessage = await logs.send({
              embeds: [logEmbed(msg, msg.member.user)],
              components: [
                new MessageActionRow()
                  .addComponents(
                    new MessageButton()
                      .setCustomId("unban")
                      .setLabel("Unban now")
                      .setStyle("DANGER")
                  ),
              ],
            });
          } catch(e) {
            console.error(e);
          }
        }

        await bansColl.insertOne({
          message: msg.toJSON(),
          user: msg.member.user.toJSON(),
          logMessage: logMessage?.id,
        });
      }
    }
  });

  discord.on("interactionCreate", async interaction => {
    if(interaction.customId === "unban") {
      if(!interaction.memberPermissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
        await interaction.reply({ content: `You need the "Ban members" permission to use this.`, ephemeral: true });

        return;
      }

      const entry = await bansColl.findOne({ logMessage: interaction.message.id });

      try {
        await discord.guilds.resolve(interaction.guildId).members.unban(entry.message.authorId);
      } catch(e) {
        console.error(e);
      }

      const date = new Date();
      await interaction.update({
        embeds: [logEmbed(entry.message, entry.user, `<t:${date.getTime().toString().slice(0, -3)}:f>`)],
        components: []
      });
      await bansColl.updateOne({ logMessage: interaction.message.id }, { $set: { revoked: date } })
    }

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
