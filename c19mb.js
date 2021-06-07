const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request');
const config = require('dotenv').config()

var mostRecent = Date.parse(0);
var updated = 0;
var data = [];
var vax = [];
var vaxPer = [];
var options = { json: true };
var covidEmbed = new Discord.MessageEmbed;

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    dailyPost(); //Fill data on launch
    setInterval(() => dailyPost(), 900000); //Start the loop, checking every 15min for new data. It only really needs to be checked around 12:30, but hey
});

client.on('message', msg => { //commands to post data on demand
    if (msg.channel.id == process.env.COVID_CHANNEL) {
        if (msg.content.toLowerCase() == '!mbvax') {
            checkVax();
            checkPercent();
        }
        else if (msg.content.toLowerCase() == '!mbcovid') {
            checkData();
            client.channels.cache.get(process.env.COVID_CHANNEL).send(covidEmbed);
            if (updated == 1) { updated = 0; }
        }
    }
});

async function dailyPost() {
    await checkData();
    await new Promise(sleep => setTimeout(sleep, 500));
    if (updated == 1) {
        updated = 0;
        client.channels.cache.get(process.env.COVID_CHANNEL).send(covidEmbed);
        checkVax();
    }
}

async function checkData() {
    let covidurl = process.env.COVID_URL;
    request.get(covidurl, options, (error, res, body) => {
        if (error) {
            return console.log(error)
        };
        if (!error && res.statusCode == 200) {
            let info = JSON.parse(JSON.stringify(body.features));
            if (Date.parse(info[0].attributes["Last_Update"]) > mostRecent) { //Checking if we've found more recent data than what's currently stored
                mostRecent = Date.parse(info[0].attributes["Last_Update"]);
                updated = 1;
                data = [];
            }
            if (updated == 1) {
                for (entry of info) {
                    data.push({ ID: entry.attributes["ObjectId"], Area: entry.attributes["Area_Name"], NewCases: entry.attributes["New_Cases"], ActiveCases: entry.attributes["Active_Cases"], ActiveICU: entry.attributes["Active_ICU_Patients"], ActiveHospi: entry.attributes["Active_Hospitalizations"] })
                }
                covidEmbed = new Discord.MessageEmbed()
                    .setColor('#304281')
                    .setTitle(`New MB Covid-19 Cases`)
                for (entry of data) {
                    if (entry["NewCases"] != null) {
                        covidEmbed.addField("------------------------------------------------",
                            `**${entry["Area"]}** - New Cases: ${entry["NewCases"]} - Active: ${entry["ActiveCases"]} - ICU: ${entry["ActiveICU"]} - Hospital: ${entry["ActiveHospi"]}`)
                    }
                }
            }
        };
    });
}

async function checkVax() {
    let vaxurl = process.env.VAX_URL;
    request.get(vaxurl, options, (error, res, body) => {
        if (error) {
            return console.log(error)
        };
        if (!error && res.statusCode == 200) {
            let info = JSON.parse(JSON.stringify(body.features));
            var size = Object.keys(info).length - 1;
            vax = [];
            vax.push({
                Date: info[size].attributes["Vaccination_Date"], TotalDoses: info[size].attributes["Total_Doses"], TotalTotal: info[size].attributes["Cumulative_Total_Doses"],
                First: info[size].attributes["First_Doses"], TotalFirst: info[size].attributes["Cumulative_First_Doses"],
                Second: info[size].attributes["Second_Doses"], TotalSecond: info[size].attributes["Cumulative_Second_Doses"]
            })
            let embed = new Discord.MessageEmbed()
                .setColor('#304281')
                .setTitle(`MB Covid-19 Vaccinations`)
            entry = vax[0];
            embed.addField("------------------------------------------------",
                `**Total Doses**: ${entry["TotalTotal"]} (+${entry["TotalDoses"]})  - ${(entry["TotalTotal"] / 13809.35).toFixed(2)}%  
                    **First Doses:** ${entry["TotalFirst"]} (+${entry["First"]})  - ${(entry["TotalFirst"] / 13809.35).toFixed(2)}% 
                    **Second Doses:** ${entry["TotalSecond"]} (+${entry["Second"]}) - ${(entry["TotalSecond"] / 13809.35).toFixed(2)}%  `)


            client.channels.cache.get(process.env.COVID_CHANNEL).send(embed);
        };
    });
}

async function checkPercent() {
    let vaxPURL = process.env.VAX_PERCENT;
    vaxPer = [];
    request.get(vaxPURL, options, (error, res, body) => {
        if (error) {
            return console.log(error)
        };
        if (!error && res.statusCode == 200) {
            let info = JSON.parse(JSON.stringify(body.features));
            for (entry of info) {
                vaxPer.push({
                    Age: entry.attributes["Age_Group"],
                    First: entry.attributes["Uptake_1_dose"],
                    Second: entry.attributes["Uptake_2_doses"]
                })
            }
            let embed = new Discord.MessageEmbed()
                .setColor('#304281')
                .setTitle(`MB Covid-19 Vaccination % by Age Group`)
            for (entry of vaxPer) {
                embed.addField("------------------------------------------------",
                    `**${entry["Age"].charAt(0).toUpperCase() + entry["Age"].slice(1)}** - First Dose : ${entry["First"]}% - Second Dose: ${entry["Second"]}%`)
            }
            client.channels.cache.get(process.env.COVID_CHANNEL).send(embed);
        };
    });
}

client.login(process.env.BOT_TOKEN);