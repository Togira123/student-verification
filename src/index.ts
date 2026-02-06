import { ActionRowBuilder, ButtonBuilder, Client, EmbedBuilder, escapeMarkdown, GatewayIntentBits, Options, Partials, SendableChannels } from 'discord.js';
import fs from 'fs';
import { ButtonStyle, MessageFlags, Routes } from 'discord-api-types/v10';

const { token, formLink, taFormLink, adminFormLink, taAdminFormLink } = JSON.parse(fs.readFileSync('./config.json', 'utf-8')) as { token: string; formLink: string; taFormLink: string; adminFormLink: string; taAdminFormLink: string; };

const botChannelId = "747768907992924192";

const serverId = "747752542741725244";

const studentRoleId = "747786383317532823";

const taRoleId = "767084137361440819";

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
			if (i.customId === "request_code" || i.customId === "request_code_ta") {
				let randomCode = ((Math.floor(Math.random() * 8) + 1).toString() + (Math.floor(Math.random() * 999_999).toString() + "000000")).substring(0, 6);
				const userId = i.user.id;
				const user = await client.users.fetch(userId);
				if (userCodes.has(userId)) {
					randomCode = userCodes.get(userId)!;
				} else {
					userCodes.set(userId, randomCode);
				}
				const linkButton = new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Visit Form");
				if (i.customId === "request_code") {
					linkButton.setURL(formLink + randomCode);
				} else {
					linkButton.setURL(taFormLink + randomCode);
				}
					
				const linkRow = new ActionRowBuilder().addComponents(linkButton);
				if (i.customId === "request_code") {
					await i.reply({
						content: `<@${userId}>\n# Your Code:\n# \\>\\>\\> ${randomCode} <<<\n\n-# Visit the form and paste the code to get verified as a student.\n\`\`\`ansi\n\u001b[0;41mCode verification is manual. It might take a few hours to receive the student role.\`\`\``,
						components: [linkRow.toJSON()],
						flags: MessageFlags.Ephemeral
					});
				} else {
					await i.reply({
						content: `<@${userId}>\n# Your Code:\n# \\>\\>\\> ${randomCode} <<<\n\n-# Visit the form and paste the code to get verified as a TA.\n\`\`\`ansi\n\u001b[0;41mCode verification is manual. It might take a few hours to receive the TA role.\`\`\``,
						components: [linkRow.toJSON()],
						flags: MessageFlags.Ephemeral
					});
				}
				const botChannel = (await client.channels.fetch(botChannelId)) as SendableChannels | null;
				if (!botChannel) {
					console.log("Cannot find #bot");
					return;
				}
				if (i.customId === "request_code") {
					const button = new ButtonBuilder()
						.setCustomId("verify_user" + userId)
						.setStyle(ButtonStyle.Primary)
						.setLabel("Verify user")
					const row = new ActionRowBuilder().addComponents(button);
					await botChannel.send({
						content: `<@${userId}> (${escapeMarkdown(user.username)})`,
						embeds: [
							new EmbedBuilder()
								.setDescription(`<@${userId}> is verifying with code \`${randomCode}\`. Check the [form responses](${adminFormLink}) to see whether they contain this code. If so, verify the user by pressing the button below.`)
								.toJSON()
						],
						components: [row.toJSON()]
					});
				} else {
					const button = new ButtonBuilder()
						.setCustomId("verify_ta" + userId)
						.setStyle(ButtonStyle.Success)
						.setLabel("Verify TA")
					const row = new ActionRowBuilder().addComponents(button);
					await botChannel.send({
						content: `<@${userId}> (${escapeMarkdown(user.username)})`,
						embeds: [
							new EmbedBuilder()
								.setDescription(`<@${userId}> is verifying for the TA role with code \`${randomCode}\`. Check the [form responses](${taAdminFormLink}) to see whether they contain this code. If so, verify the TA by pressing the button below.`)
								.setColor("Green")
								.toJSON()
						],
						components: [row.toJSON()]
					});
				}
			} else if (i.customId.startsWith("verify_user") || i.customId.startsWith("verify_ta")) {
				const userId = i.customId.startsWith("verify_user") ? i.customId.substring("verify_user".length) : i.customId.substring("verify_ta".length);
				const guild = await client.guilds.fetch(serverId);
				const member = await guild.members.fetch(userId);
				if (i.customId.startsWith("verify_user")) {
					await member.roles.add(studentRoleId);
					const button = new ButtonBuilder()
						.setCustomId("verify_user" + userId)
						.setStyle(ButtonStyle.Secondary)
						.setLabel("Verified")
						.setDisabled(true)
					const row = new ActionRowBuilder().addComponents(button);
					await i.reply({ content: "User successfully verified!" });
					await i.message.edit({
						components: [row.toJSON()],
					});
				} else {
					await member.roles.add(taRoleId);
					const button = new ButtonBuilder()
						.setCustomId("verify_ta" + userId)
						.setStyle(ButtonStyle.Secondary)
						.setLabel("Verified as TA")
						.setDisabled(true)
					const row = new ActionRowBuilder().addComponents(button);
					await i.reply({ content: "User successfully TAed!" });
					await i.message.edit({
						components: [row.toJSON()],
					});
				}
			}
		}
	} catch (e) { console.error(e) }
});

client.once('ready', async () => {
	console.log("Bot is ready");
});
