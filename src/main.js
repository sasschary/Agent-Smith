import {createRequire} from "module";

import {copyFileSync, existsSync, readFileSync, writeFileSync} from "fs";

const require = createRequire(import.meta.url);
const {Client} = require('discord.js');
const {google} = require('googleapis');
const googleapis = require('googleapis');

/**
 * The AgentSmith main class
 */
class AgentSmith extends Client {
    prefix = "!as";

    constructor() {
        super();

        if (!existsSync("./settings.json")) {
            copyFileSync("./DefaultSettings.json", "./settings.json");
        }
        this.settings = JSON.parse(readFileSync("./settings.json"));

        this.isStreaming = false;

        this.on("ready", () => {
            if (!this.user.bot) {
                console.error("Agent Smith is a bot. Please use a bot token, not a user token!");
                process.exit(1);
            }
        });

        this.on("message", (msg) => {
            if (msg.cleanContent.startsWith(this.prefix) && msg.author.id !== this.user.id) {
                const data = msg.cleanContent;
                const splitData = data.split(" ");

                if (splitData[1] === "config") {
                    this.startConfig(msg);
                } else {
                    msg.reply("Unknown command!");
                }

            }
        });

    }

    start() {
        this.login(this.settings.discordBotToken);
        // this.checkLivestream();
    }

    saveSettings() {
        writeFileSync("settings.json", JSON.stringify(this.settings, null, 2));
    }

    /**
     * Configure the bot, sending config messages in the given channel
     * @param {Message} message: The message to parse details from
     */
    startConfig(message) {
        const msgTxt = message.content;
        const commandRegex = / "(.*)" (.*) (.*)/g;
        const idRegex = /<#(\d+)>/g;
        const msgParse = msgTxt.split(commandRegex);

        if (msgParse.length !== 5 || msgParse[2].match(idRegex) === null || msgParse[3].match(idRegex) === null) {
            message.reply("Invalid command syntax!");
            return;
        }

        //Saving the settings
        this.getYTChannelId(msgParse[1]);
        const currStreamChan = msgParse[2].split(idRegex)[1];
        const pastStreamChan = msgParse[3].split(idRegex)[1];
        this.settings.livestreamDcChannelId = currStreamChan;
        this.settings.pastStreamsDcChannelId = pastStreamChan;
        this.saveSettings();
        message.reply("Updated config!");
    }

    /**
     * Converts youtube channel name to ID
     * @param {string} channelName
     */
    getYTChannelId(channelName) {
        return google.youtube({ version: "v3", auth: this.settings.youtubeApiKey}).search.list(
            {
                part: [
                    "snippet"
                ],
                q : channelName,
                type : [ "channel" ]
            }
        ) .then((response) => {
            this.settings.ytChannelId = response.data.items[0].snippet.channelId;
            this.saveSettings();
       }, error => console.error(error));
    }

    async checkLivestream() {
        const sleep = (ms) => {
            return new Promise(res => setTimeout(res, ms));
        }

        // while (true) {

            google.youtube({ version: "v3", auth: this.settings.youtubeApiKey}).channels.list({
                part: ["snippet"],
                id: this.settings.ytChannelId
            }).then(res => {
                console.log(JSON.stringify(res, null, 2));
            }, error => console.error(error));

            // console.log(this.isStreaming);

            await sleep(10000000);
        // }
    }

}

const bot = new AgentSmith();
bot.start();
