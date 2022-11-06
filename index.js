import TelegramBot from 'node-telegram-bot-api';
import { readFile, writeFile, readFileSync } from 'fs';
import { config } from 'dotenv';
config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const dataFile = 'data.json';

const saveData = (input, id) => {
  readFile(dataFile, function (err, data) {
    const parsedData = JSON.parse(data);

    // create an empty array if user does not have entry before
    if (parsedData[id] === undefined) {
      parsedData[id] = [];
    }

    // increment last id
    input.id = (parsedData[id].at(-1)?.id || 0) + 1;

    parsedData[id].push(input);
    writeFile(dataFile, JSON.stringify(parsedData), () => { })
  });
}

const isSaved = (uid, kw) => {
  const data = readFileSync(dataFile);
  const json = JSON.parse(data);
  return !!json[`${uid}`]?.find(e => e.title === kw);
}

const parts = (k) => {
  let title, description;

  const hasDesc = (q) => {
    const regex = new RegExp(/(, )./);
    return regex.test(q);
  }

  if (hasDesc(k)) {
    const arr = k.split(',').map(e => e.trim());
    title = arr[0];
    description = arr[1];
  }
  else {
    title = k.replace(',', '').trim();
    description = undefined;
  }

  return {
    title,
    description
  }
}

/*
  bot events
*/
bot.on('inline_query', (msg) => {
  const uid = msg.from.id;
  const query = msg.query;
  const title = parts(query).title;
  const description = parts(query).description ?? 'tap to save';
  const data = readFileSync(dataFile);
  const json = JSON.parse(data);
  // const articles = json[`${uid}`] || [];
  const articles = Object.values(json).flat().filter(e => e.title.startsWith(title));
  const newArticle = isSaved(uid, title) ? [] : [
    {
      type: 'article',
      id: Date.now(),
      title: title || 'Write something,',
      description,
      input_message_content:
      {
        message_text: `${title || 'nothing'} saved`
      }
    }
  ];

  bot.answerInlineQuery(msg.id, [...newArticle, ...articles], { cache_time: 0 });
});

bot.on('chosen_inline_result', (msg) => {
  const uid = msg.from.id;
  const query = msg.query;
  if (isSaved(uid, parts(query).title)) return;

  saveData({
    type: 'article',
    title: parts(query).title,
    description: parts(query).description,
    input_message_content: {
      message_text: query,
    }
  }, uid);
});

bot.on('polling_error', (error) => {
  console.log(error);
});