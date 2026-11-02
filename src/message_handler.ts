import { botChannelId } from "./constants.ts";
import { client } from "./client.ts";

type MessageInfo = {
    at: number;
    channelId: string;
    messageId: string;
}

type Messages = {
    idx: number // index of last message added
    messages: MessageInfo[];
}

const lastMessageForMember = new Map<string, Messages>();

const MESSAGE_TIME_THRESHOLD = 1000;

const MESSAGE_INFO_SIZE = 32;

client.on("messageCreate", async msg => {
    try {
        if (!msg.inGuild() || msg.author.bot) {
            return;
        }
        if (msg.member && msg.attachments.size > 0) {
            const lastMessagesStruct = lastMessageForMember.get(msg.member.id);
            if (lastMessagesStruct) {
                const messages = lastMessagesStruct.messages;
                let recentMsgsInOtherChannels: MessageInfo[] = [];
                for (let i = 0; i < MESSAGE_INFO_SIZE; i++) {
                    const message = messages[(lastMessagesStruct.idx - i + MESSAGE_INFO_SIZE) % MESSAGE_INFO_SIZE];
                    if (msg.createdTimestamp - message.at > MESSAGE_TIME_THRESHOLD) {
                        break;
                    }
                    if (msg.channelId !== message.channelId) {
                        recentMsgsInOtherChannels.push(message);
                    }
                }
                if (recentMsgsInOtherChannels.length > 0) {
                    // sent two messages close together in different channels 
                    await msg.member.timeout(60 * 60 * 1000, "Sent two messages with attachments in different channels in a short period of time");
                    for (const m of recentMsgsInOtherChannels) {
                        const channel = await client.channels.fetch(m.channelId);
                        if (channel && channel.isTextBased()) {
                            (await channel.messages.fetch(m.messageId))?.delete();
                        }
                    }
                    const botChannel = await client.channels.fetch(botChannelId);
                    if (botChannel && botChannel.isSendable()) {
                        await botChannel.send({ content: `<@${msg.author.id}> timed out automatically due to sending message with attachments in different channels too quickly. Attachments were:`, files: [...msg.attachments.values()] });
                    }
                }
                const nextIdx = (lastMessagesStruct.idx + 1) % MESSAGE_INFO_SIZE;
                messages[nextIdx] = {
                    at: msg.createdTimestamp,
                    channelId: msg.channelId,
                    messageId: msg.id
                }
                lastMessagesStruct.idx++;
            } else {
                const msgs: MessageInfo[] = Array(MESSAGE_INFO_SIZE);
                for (const msg of msgs) {
                    msg.at = 0;
                }
                msgs[0] = {
                    at: msg.createdTimestamp,
                    channelId: msg.channelId,
                    messageId: msg.id
                };
                lastMessageForMember.set(msg.member.id, { idx: 0, messages: msgs });
            }
        }
    } catch (e) {
        console.error(e);
    }
});
