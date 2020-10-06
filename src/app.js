const { App } = require('@slack/bolt');
const { getMemes } = require('./common-functions/get-memes-templates');
const { getCaptionedMemeUrl } = require('./common-functions/create-meme');
require("dotenv").config()
const axios = require('axios');

const COMMAND = process.env.COMMAND_NAME || 'memer'

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
app.command(`/${COMMAND}`, async ({ command, ack, body }) => {
  // Acknowledge command request
  await ack();
  console.log('command initiated!');
  const commandParts = command.text.split(';');
  const searchParams = commandParts[0].trim();
  var caption1 = ' ';
  var caption2 = ' ';
  if(commandParts.length != 3 && commandParts.length != 1) {
    await notifyUserOfError(body.response_url, 'Must provide string in format: /command searchParams; caption; caption');
    return;
  }
  else {
    if(commandParts.length != 1){
      caption1 = commandParts[1].trim();
      caption2 = commandParts[2].trim();
    }
    const memes = await getMemes(searchParams, false);
    if(memes.count > 0) {
      const firstMemeTemplate = memes.images[0];
      const captionedMemeUrl = await getCaptionedMemeUrl(firstMemeTemplate.templateId, caption1, caption2);
      
      if(captionedMemeUrl) {
        await getCaptionedUrlAndUpdateMessage(body.response_url, firstMemeTemplate, 0, memes.count, {
          searchKey: searchParams,
          caption1: caption1,
          caption2: caption2
        });
      }
      else {
        console.error('Caption request failed.. no image returned');
        await notifyUserOfError(body.response_url, 'Unable to generate meme from template..');
      }
    }
    else {
      console.error('No templates found for the search term');
      await notifyUserOfError(body.response_url, 'No meme templates found ..');
    }
  }
});

app.action('post_meme', async ({ ack, payload, body }) => {
  await ack();
  console.log(`Posting current meme: ${payload.value}`);
  // delete ephemeral message
  await axios.post(body.response_url, {
    "delete_original": "true",
    "response_type": "in_channel",
    "text": payload.value
  }).then(async () => {
    console.log('Posted meme!');
  });
});

app.action('get_next_meme', async ({ ack, body, payload }) => {
  await ack();
  console.log('Going to next meme');
  await goToSpecifiedIndex(payload.value, body.response_url);
});
app.action('get_previous_meme', async ({ ack, body, payload }) => {
  await ack();
  console.log('Going to previous meme');
  await goToSpecifiedIndex(payload.value, body.response_url);
});

app.action('delete_message', async ({ ack, body }) => {
  await ack();
  console.log('Cancelling current action');
  // Update the message to reflect the action
  await axios.post(body.response_url, {
    "delete_original": "true"
  });
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is kind of running!');
})();

/*
  HELPER FUNCTIONS
*/

function getUIBlocks(name, url, thisIndex, totalMemes, context) {
  let nextMemeIndex = thisIndex + 1;
  if(nextMemeIndex >= totalMemes) {
    nextMemeIndex = 0;
  }

  let previousMemeIndex = thisIndex - 1;
  if(previousMemeIndex < 0) {
    previousMemeIndex = totalMemes - 1;
  }

  const stringifiedContext = JSON.stringify(context);
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
                "value": `${nextMemeIndex}._.${stringifiedContext}`
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Previous",
                  "emoji": false
                },
                "action_id": "get_previous_meme",
                "value": `${previousMemeIndex}._.${stringifiedContext}`
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

// deconstructs the payload.value
// that is specified in the original call
// goes to the index specified inside payload.value
// expects value to be formatted as such:
// index._.{ searchKey, caption1, caption2 }
// ex: 3._.{"searchKey":"wow","caption1":"it's a boy","caption2":"no it's a smoy"}
async function goToSpecifiedIndex(payloadValue, responseUrl) {
  // Update the message to reflect the action
  // value contains index and a stringified context object
  // containing search key + captions
const index_searchKey = payloadValue.split('._.');
const index = Number(index_searchKey[0] || 0);
const stringifiedContext = index_searchKey[1] || '{}';
const storedContext = JSON.parse(stringifiedContext);

if(storedContext.searchKey  != undefined &&
  storedContext.caption1 != undefined && 
  storedContext.caption2 != undefined) {

    // get the memes (most likely returned from cache)
    const memes = await getMemes(storedContext.searchKey, false);

    if(memes && memes.count > 0) {
      // we got some memes back
      const anotherImage = memes.images[index];
      console.log(`Returning captioned image: ${anotherImage.src}`)
      await getCaptionedUrlAndUpdateMessage(responseUrl, anotherImage, index, memes.count, storedContext);
    }
    else {
      console.log('Forcing cache refresh.. Cache hit failed');
      // force a cache request... maybe the user let the cache expire?
      const memes = await getMemes(storedContext.searchKey, true);
      if(memes && memes.count > 0) {
        // we got some memes back
        const anotherImage = memes.images[index];
        console.log(`Returning captioned image: ${anotherImage.src}`)
        await getCaptionedUrlAndUpdateMessage(responseUrl, anotherImage, index, memes.count, storedContext);
      }
      else {
        console.warn("No memes found");
        await notifyUserOfError(responseUrl, "No memes found!");
      }
    }
  }
  else {
    console.error("Context not returned in expected format");
    await notifyUserOfError(responseUrl, "Something went wrong!");
  }
}

// updat
async function getCaptionedUrlAndUpdateMessage(responseUrl, someImage, index, totalCount, storedContext) {
  const captionedMemeUrl = await getCaptionedMemeUrl(someImage.templateId, storedContext.caption1, storedContext.caption2);
  if(captionedMemeUrl) {
    await axios.post(responseUrl, {
      "response_type": "ephemeral",
      "attachments": getUIBlocks(someImage.name, captionedMemeUrl, index, totalCount, storedContext)
    })
  }
  else {
    await notifyUserOfError(responseUrl, "Error while generating captioned meme...");
  }
}


// removes the attachment
// and notifies user of error 
async function notifyUserOfError(responseUrl, errorText) {
  await axios.post(responseUrl, {
    "response_type": "ephemeral",
    "text": errorText,
    "replace_original": "true"
  })
}