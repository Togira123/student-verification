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
				const button = new ButtonBuilder()
					.setCustomId(`verification_done${randomCode}${userId}`)
					.setStyle(ButtonStyle.Primary)
					.setLabel("I filled out the form")
				const row = new ActionRowBuilder().addComponents(button);
				await i.reply({
					content: `Your personal code is: \`${randomCode}\`. Click the following link and put it in the form: ${formLink}. **After submitting the form, click the button below to finish the verification.**`,
					components: [row.toJSON()],
					flags: MessageFlags.Ephemeral
				});

			} else if (i.customId.startsWith("verification_done")) {
				const botChannel = (await client.channels.fetch(botChannelId)) as SendableChannels | null;
				if (!botChannel) {
					console.log("Cannot find #bot");
					return;
				}
				const code = i.customId.substring("verification_done".length, "verification_done".length + 6);
				const userId = i.customId.substring("verification_done".length + code.length);
				const button = new ButtonBuilder()
					.setCustomId("verify_user" + userId)
					.setStyle(ButtonStyle.Primary)
					.setLabel("Verify user")
				const row = new ActionRowBuilder().addComponents(button);
				await botChannel.send({
					embeds: [
						new EmbedBuilder()
							.setDescription(`<@${userId}> verified with code \`${code}\`. Check the [form responses](${adminFormLink}) to see whether they contain this code. If so, verify the user by pressing the button below.`)
							.toJSON()
					],
					components: [row.toJSON()]
				});
				await i.reply({
					content: "Verification Request submitted! Note that it might take several hours before you get the role. You can now dismiss these messages.",
					flags: MessageFlags.Ephemeral
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
				await i.message.edit({
					components: [row.toJSON()],
				});
				await i.reply({ content: "User successfully verified!" });
			}
		}
	} catch (e) { console.error(e) }
});

client.once('ready', async () => {
	console.log("Bot is ready");
});
