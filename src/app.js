const { App } = require('@slack/bolt');
const { getMemes } = require('./common-functions/get-memes-templates');
require("dotenv").config()

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
app.command('/memer', async ({ command, ack, say, context }) => {
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
    console.log({
      token: context.botToken,
      channel: command.channel_id,
      user: command.user_id,
      blocks: getUIBlocks(memes.images[0])
    });
    await app.client.chat.postEphemeral({
      token: context.botToken,
      channel: command.channel_id,
      user: command.user_id,
      attachments: getUIBlocks(memes.images[0])
    });
  }
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is kind of running!');
})();

function getUIBlocks(image) {
  return [{
        "blocks": [
          {
            "type": "image",
            "title": {
              "type": "plain_text",
              "text": image.name
            },
            "image_url": image.src,
            "alt_text": image.name
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
                "style": "primary"
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Next",
                  "emoji": false
                }
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Previous",
                  "emoji": false
                }
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Cancel",
                  "emoji": false
                },
                "style": "danger"
              }
            ]
          }
        ]
      }]
}