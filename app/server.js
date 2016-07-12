// ==========================[ initialization ]================================>

import botkit from 'botkit';


// es6 syntax for importing libraries
// in older js this would be: var botkit = require('botkit')

const fetch = require('node-fetch');    // fetch
const Yelp = require('yelp');           // Yelp

// yelp object, when need yelp will act on this
const yelp = new Yelp({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET,
});

// at startup
console.log('starting bot');

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

// =========================[ Misc. Replies & Setup ]==========================>

// hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// outgoing webhook to wake up bot, replies when mentioned as @ahsan_bot
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'i\'m awakeeeee http://giphy.com/gifs/lol-star-wars-7zdsOWDgSCzDi');
});

// help required
controller.hears('help', ['direct_mention', 'mention', 'direct_message'], (bot, message) => {
  console.log('sending help message');
  bot.reply(message, 'Hi, my name is golem (short for Self-Reliant Riot' +
                      ' Control Golem). I\'m just your friendly everyday' +
                      ' bot, except better. I can do so much and so much' +
                      ' more. Here are a few things I can help you with: ');
});

// =======================[ Yelp food conversation ]===========================>

controller.hears('hungry', ['direct_mention', 'mention', 'direct_message'], (bot, message) => {
  bot.startConversation(message, askWantFood);
});

function askWantFood(response, convo) {
  convo.ask(':pizza:Would you like food recommendations nearby?', () => {
    convo.say('Awesome.');
    askTypeFood(response, convo);
    convo.next();
  });
}

function askTypeFood(response, convo) {
  const foodKindResp = { key: 'foodKind', multiple: false };
  convo.ask('What kind of food do you like?', () => {
    convo.say('Ok.');
    askLocationFood(response, convo);
    convo.next();
  }, foodKindResp);
}

function askLocationFood(response, convo) {
  const locationResp = { key: 'foodLocation', multiple: false };
  convo.ask('So where do you live?', () => {
    convo.say('Ok! Give me a second . . .');
    tellFoodPlaces(response, convo);
    convo.next();
  }, locationResp);
}

function tellFoodPlaces(response, convo) {
  const foodKindStr = convo.extractResponse('foodKind');
  const foodLocationStr = convo.extractResponse('foodLocation');
  convo.say('Here are the 10 best results: ');
  // See http://www.yelp.com/developers/documentation/v2/search_api
  yelp.search({ term: `food+${foodKindStr}`, location: `${foodLocationStr}`, category_filter: 'food,restaurants', sort: 1, limit: 10 })
  .then((data) => {
    console.log(data);
    data.businesses.forEach(business => {
      // do something with business
      const replyWithAttachments = {
        username: '',
        text: '',
        attachments: [
          {
            fallback: 'Oops ... this restaurant doesn\'t seem available',
            pretext: '',
            title: `:yum: ${business.name}`,
            title_link: `${business.mobile_url}`,
            text: `rating: ${business.rating}\n${business.snippet_text}\n` +
                  `:phone: ${business.display_phone}`,
            image_url: `${business.image_url}`,
            color: '#7CD197',
            unfurl_media: true,
            unfurl_links: true,
          },
        ],
        icon_url: '',
      };

      convo.say(replyWithAttachments);
    });
  })
  .catch((err) => {
    console.error(err);
  });
}

// ========================[ Open Weather query ]==============================>

// fetch based API use - note use of node-fetch from (https://github.com/bitinn/node-fetch),
// since normal isn't defined. Use of fetch based on:
// https://developers.google.com/web/updates/2015/03/introduction-to-fetch?hl=en
// https://github.com/bitinn/node-fetch

controller.hears('weather', ['direct_mention', 'mention', 'direct_message'], (bot, message) => {
  bot.startConversation(message, askLocationWeather);
});

function askLocationWeather(response, convo) {
  const locationResp = { key: 'weatherLocation', multiple: false };
  convo.ask('I\'ll have your weather coming right up!\nFirst -- where do ' +
            'you want the weather for? (e.g. hanover,nh)', () => {
    convo.say('Ok! Give me a second . . .');
    tellWeather(response, convo);
    convo.next();
  }, locationResp);
}

function tellWeather(response, convo) {
  const weatherLocationStr = convo.extractResponse('weatherLocation');
  const URLFinal = 'http://api.openweathermap.org/data/2.5/weather?q=' +
                `${weatherLocationStr}&appid=7de6373d8e813bf64c4dab674a9c2429` +
                '&units=metric';
  console.log(`###$#$#$#$$#$#$$ FINAL URL IS  ${URLFinal}`);
  fetch(`${URLFinal}`)
    .then((Wresponse) => {
      if (Wresponse.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
                    `${Wresponse.status}`);
        return;
      }
      // Examine the text in the response
      Wresponse.json().then((fetchedData) => {
        console.log(fetchedData);
        const replyWWithAttachments = {
          username: '',
          text: '',
          attachments: [
            {
              mrkdwn: true,
              fallback: 'Oops ... the weather doesn\'t seem available',
              pretext: '',
              title: `The Weather Right Now -- ${fetchedData.weather[0].main}`,
              title_link: '',
              text: `:heavy_check_mark: ${fetchedData.weather[0].description},\n` +
                    `:heavy_check_mark: ${fetchedData.main.temp}\xB0C     ` +
                    `( high: ${fetchedData.main.temp_max}` +
                    `, low: ${fetchedData.main.temp_max} )\n`,
              image_url: `http://openweathermap.org/img/w/${fetchedData.weather[0].icon}.png`,
              color: '#7CD197',
              unfurl_media: true,
              unfurl_links: true,
            },
          ],
          icon_url: '',
        };

        convo.say(replyWWithAttachments);
      });
    }
    )
    .catch((err) => {
      console.log('Fetch Error :-S', err);
    });
}

// ============================================================================>

// default reply, triggered when no specific case fulfilled
controller.hears('(.*)', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  console.log('sending default message');
  bot.reply(message, 'Hhhhmm I didn\'t quite get that ... maybe rephrase it?');
});
