const axios = require('axios');
const NodeCache = require('node-cache');

// expiring cache of 3600 seconds
const resultCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

async function getCaptionedMemeUrl(templateId, text0, text1) {
  if(text0.length == 0 && text1.length == 0){
    text0 = ' ';
    text1 = ' ';
  }
  const cacheKey = `${templateId}_${text0}_${text1}`;
  var cachedValue = resultCache.get(cacheKey);
  if(cachedValue !== undefined) {
    console.log(`Returning cached value for key: ${cacheKey}`);
    return cachedValue;
  }
  const captionResponse = await getCaptionedImage(templateId, text0, text1);
  if(captionResponse && captionResponse.data.data !== undefined) {
    console.log(`Image response recieved from captioning api for value: ${cacheKey}`);

    const memeUrl = captionResponse.data.data.url;
    resultCache.set(cacheKey, memeUrl);
    return memeUrl;
  }
  return null;
}

function getCaptionedImage(templateId, text0, text1) {
  const searchParams = new URLSearchParams();
  searchParams.set('template_id', templateId);
  searchParams.set('text0', text0);
  searchParams.set('text1', text1);
  searchParams.set('username', process.env.IMGFLIP_USERNAME);
  searchParams.set('password', process.env.IMGFLIP_PASSWORD);

  return axios.post(`https://api.imgflip.com/caption_image?${searchParams.toString()}`);
}

module.exports = { getCaptionedMemeUrl };