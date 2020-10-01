const NodeCache = require('node-cache');
const axios = require('axios');
const JSSoup = require('jssoup').default;

// expiring cache of 3600 seconds
const resultCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

function getWeppageHTML(searchParams) {
  return axios.get(
    `https://imgflip.com/memesearch?q=${searchParams}`
  );
}

async function getMemes(searchParams, forceRefreshCache) {
  if(forceRefreshCache) {
    // if the user wants to force a deletion of the 
    // cache, we'll delete it
    console.log('forcing deletion of query string');
    resultCache.del(searchParams);
  }


  const cachedResponse = resultCache.get(searchParams);
  if(cachedResponse !== undefined) {
    cachedResponse.returnDate = new Date().toISOString();
    console.log(`Returning cached search results for search string: ${cachedResponse}`);
    return cachedResponse;
  }

  // download the website
  var websiteHtml = await getWeppageHTML(searchParams);

  // turn it into soup
  const soup = new JSSoup(websiteHtml.data);
  var returnedImageCount = 0;

  // contains the anchor and the image element that
  // we need to scrape
  var imageWrappers = soup.findAll('div', 'mt-box');
  const imageObjects = [];
  imageWrappers.forEach(element => {
    //href contains reference to template id
    const href = element.find('a').attrs.href;
    var templateId = href.split('/')[2];
    if(Number(templateId)) {
      // for now we can only scrape images that have a 
      // template id available as there's no way to find 
      // it from imgflip
      const imgAttrs = element.find('img').attrs;
      const imageSrc = imgAttrs.src.replace('//', '');
      const imageName = imgAttrs.alt;
      returnedImageCount++;
      // console.log(returnedImageCount);
      imageObjects.push({ templateId: Number(templateId), name: imageName, src: imageSrc, });
    }
  });

  const thisTime = new Date().toISOString();
  const result = {
    creationDate: thisTime,
    returnDate: thisTime,
    count: returnedImageCount,
    images: imageObjects,
  };
  // console.log(result);
  resultCache.set(searchParams, result);
  console.log(`Result set contains ${result.count} for search term ${searchParams}. Caching result..`);

  return result;
}

module.exports = { getMemes };