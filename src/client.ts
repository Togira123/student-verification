import { Client, GatewayIntentBits, Options, Partials } from 'discord.js';
export const client = new Client({
    makeCache: Options.cacheWithLimits({
        MessageManager: 20,
    }),
    partials: [Partials.Channel],
    intents: [GatewayIntentBits.Guilds]
});
