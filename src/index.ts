import { ActionRowBuilder, ButtonBuilder, Client, EmbedBuilder, GatewayIntentBits, Options, Partials, SendableChannels } from 'discord.js';
import fs from 'fs';
import { ButtonStyle, MessageFlags, Routes } from 'discord-api-types/v10';

const { token, formLink, adminFormLink } = JSON.parse(fs.readFileSync('./config.json', 'utf-8')) as { token: string; formLink: string; adminFormLink: string; };

const botChannelId = "747768907992924192";

const serverId = "747752542741725244";

const studentRoleId = "747786383317532823";

const client = new Client({
	makeCache: Options.cacheWithLimits({
		MessageManager: 20,
	}),
	partials: [Partials.Channel],
	intents: [GatewayIntentBits.Guilds]
});

// Log in to discord
client.login(token).catch(e => console.log(e));

const userCodes = new Map<string, string>();

client.on('interactionCreate', async i => {
	try {
		if (!i.inCachedGuild()) return;
		if (i.isButton()) {
			if (i.customId === "request_code") {
				let randomCode = (Math.floor(Math.random() * 999_999).toString() + "000000").substring(0, 6);
				const userId = i.user.id;
				if (userCodes.has(userId)) {
					randomCode = userCodes.get(userId)!;
				} else {
					userCodes.set(userId, randomCode);
				}
				const linkButton = new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Form")
					.setURL(formLink)
				const linkRow = new ActionRowBuilder().addComponents(linkButton);
				await i.reply({
					content: `Your personal code is: \`${randomCode}\`. Click the button below to open the form. Paste your code and submit. Note that it might take several hours before you get the role.`,
					components: [linkRow.toJSON()],
					flags: MessageFlags.Ephemeral
				});
				const botChannel = (await client.channels.fetch(botChannelId)) as SendableChannels | null;
				if (!botChannel) {
					console.log("Cannot find #bot");
					return;
				}
				const button = new ButtonBuilder()
					.setCustomId("verify_user" + userId)
					.setStyle(ButtonStyle.Primary)
					.setLabel("Verify user")
				const row = new ActionRowBuilder().addComponents(button);
				await botChannel.send({
					embeds: [
						new EmbedBuilder()
							.setDescription(`<@${userId}> is verifying with code \`${randomCode}\`. Check the [form responses](${adminFormLink}) to see whether they contain this code. If so, verify the user by pressing the button below.`)
							.toJSON()
					],
					components: [row.toJSON()]
				});
			} else if (i.customId.startsWith("verify_user")) {
				const userId = i.customId.substring("verify_user".length);
				const guild = await client.guilds.fetch(serverId);
				const member = await guild.members.fetch(userId);
				await member.roles.add(studentRoleId);
				const button = new ButtonBuilder()
					.setCustomId("verify_user" + userId)
					.setStyle(ButtonStyle.Primary)
					.setLabel("Verify user")
					.setDisabled(true)
				const row = new ActionRowBuilder().addComponents(button);
				await i.reply({ content: "User successfully verified!" });
				await i.message.edit({
					components: [row.toJSON()],
				});
			}
		}
	} catch (e) { console.error(e) }
});

client.once('ready', async () => {
	console.log("Bot is ready");
});
