const { App } = require('@slack/bolt');
const { getMemes } = require('./common-functions/get-memes-templates');
const { getCaptionedMemeUrl } = require('./common-functions/create-meme');
require("dotenv").config()

const COMMAND = process.env.COMMAND_NAME || 'memer'

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
app.command(`/${COMMAND}`, async ({ command, ack, say, context }) => {
  // Acknowledge command request
  await ack();
  console.log(command);
  const commandParts = command.text.split(';');
  const searchParams = commandParts[0];
  const caption1 = commandParts[1];
  const caption2 = commandParts[2];

  if(commandParts.length != 3) {
    await say('Must provide string in format: /command searchParams; caption; caption');
    return;
  }
  else {
    const memes = await getMemes(searchParams, false);
    const firstMemeTemplate = memes.images[0];
    const captionedMemeUrl = await getCaptionedMemeUrl(firstMemeTemplate.templateId, caption1, caption2);
    console.log(memes.count);
    
    if(captionedMemeUrl) {
      await app.client.chat.postEphemeral({
        token: context.botToken,
        channel: command.channel_id,
        user: command.user_id,
        attachments: getUIBlocks(firstMemeTemplate.name, captionedMemeUrl, 0, memes.count)
      });
    }
    else {
      await app.client.chat.postEphemeral({
        token: context.botToken,
        channel: command.channel_id,
        user: command.user_id,
        text: 'Unable to generate meme from template..'
      });
    }
  }
});

app.action('post_meme', async ({ ack, say, payload }) => {
  await ack();
  // Update the message to reflect the action
  console.log(payload);
  // console.log
  await say (payload.value);
});

app.action('get_next_meme', async ({ ack, say, context, body, payload }) => {
  await ack();
  // Update the message to reflect the action
  console.log(context);
  console.log(body);
  console.log(payload);
  context.updateConversation('test')
  await say('next clicked');
});
app.action('get_previous_meme', async ({ ack, say }) => {
  await ack();
  // Update the message to reflect the action
  await say('previous clicked');
});

app.action('delete_message', async ({ ack, say }) => {
  await ack();
  // Update the message to reflect the action
  await say('cancel clicked');
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is kind of running!');
})();

function getUIBlocks(name, url, thisIndex, totalMemes) {
  let nextMemeIndex = thisIndex + 1;
  if(thisIndex >= totalMemes) {
    nextMemeIndex = 0;
  }

  let previousMemeIndex = thisIndex - 1;
  if(thisIndex < 0) {
    previousMemeIndex = totalMemes - 1;
  }
  return [{
        "blocks": [
          {
            "type": "image",
            "title": {
              "type": "plain_text",
              "text": name
            },
            "image_url": url,
            "alt_text": name
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Post",
                  "emoji": false
                },
                "style": "primary",
                "action_id": "post_meme",
                "value": url,
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Next",
                  "emoji": false
                },
                "action_id": "get_next_meme",
                "value": nextMemeIndex.toString()
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Previous",
                  "emoji": false
                },
                "action_id": "get_previous_meme",
                "value": previousMemeIndex.toString()
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Cancel",
                  "emoji": false
                },
                "style": "danger",
                "action_id": "delete_message"
              }
            ]
          }
        ]
      }]
}