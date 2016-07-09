import botkit from 'botkit';
// this is es6 syntax for importing libraries
// in older js this would be: var botkit = require('botkit')

// Yelp
const Yelp = require('yelp');

// checking whether a specific case is fulfilled
// let match = false;

const yelp = new Yelp({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET,
});

// at startup
console.log('starting bot');

// See http://www.yelp.com/developers/documentation/v2/business
// SAMPLE YELP CODE:
// yelp.business('yelp-san-francisco')
//   .then(console.log)
//   .catch(console.error);

// botkit controller
const controller = botkit.slackbot({
  debug: true,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// example hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// outgoing webhook, replies when mentioned as @ahsan_bot
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'i\'m awakeeeee http://giphy.com/gifs/lol-star-wars-7zdsOWDgSCzDi');
});

// default reply, triggered when no specific case fulfilled
controller.hears('help', ['direct_mention', 'mention', 'direct_message'], (bot, message) => {
  console.log('sending help message');
  bot.reply(message, 'Hi, my name is golem (short for Self-Reliant Riot' +
                      ' Control Golem). I\'m just your friendly everyday' +
                      ' bot, except better. I can do so much and so much' +
                      ' more. Here are a few things I can help you with: ');
});

// default reply, triggered when no specific case fulfilled
controller.hears('(.*)', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  console.log('sending default message');
  bot.reply(message, 'Hhhhmm I didn\'t quite get that ... maybe rephrase it?');
});
