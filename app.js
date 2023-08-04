const followRedirects = require('follow-redirects');
const http = require('http');
const https = require('follow-redirects').https;
const sharp = require('sharp');
const fs = require('fs');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const { randomUUID } = require('crypto');

const card = { 'width': 480, 'height': 680, 'scale': 0.5 };
const compositeSize = { 'width': 15, 'height': 15 };
let processing = false;
let storedRequest = [];

followRedirects.maxRedirects = 2;

const server = http.createServer();

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
}

server.use(allowCrossDomain);

server.on('request', async (request, response) => {

  console.log("Someone is making a request from the server!");
  console.log("request: " + request.url);

  // Array of the requested card names
  let tempCards = request.url.substring(1).split("%0A");

  //I know it's dumb, but there may be whitespace at the end to remove and this was the first thing I though of
  let cardsRealSize = 0;
  for (let i = 0; i < tempCards.length; i++) {
    if (tempCards[i] != "") {
      cardsRealSize++;
    }
  }
  let cards = new Array(cardsRealSize);
  let cardIndex = 0;
  for (let i = 0; i < cardsRealSize; i++) {
    if (tempCards[i] != "") {
      cards[cardIndex] = tempCards[i];
      cardIndex++;
    }
  }

  // Terminate a favicon request TODO: change this to terminate any non-card requests
  if (cards.includes("favicon.ico")) {
    response.statusCode = 400;
    response.end();
    return;
  }

  // Terminate if still processing after 20 seconds
  for (let i = 0; processing && i < 20; i++) {
    let index = storedRequest.indexOf(request.url);
    if (index > -1) {
      response.writeHead(200, { 'Content-Type': 'video/mp4' })

      const videoStream = fs.createReadStream(storedRequest[index-1]);
      videoStream.pipe(response);
      
      console.log("sent stored image");

      await delay(50);

      response.end();
      return;
    }

    await delay(1000);
  }
  if (processing) {
    response.statusCode = 408;
    response.end();
    return;
  }
  else
  {
    const index = storedRequest.indexOf(request.url);
    if (index > -1) {
      response.writeHead(200, { 'Content-Type': 'video/mp4' })

      const videoStream = fs.createReadStream(storedRequest[index-1]);
      videoStream.pipe(response);

      console.log("sent stored image");
      
      await delay(50);

      response.end();
      return;
    }
  }

  processing = true;

  // Create a background to composite on
  const backgroundRaw = {
    'width': (card["width"] * card["scale"]) * compositeSize["width"],
    'height': (card["height"] * card["scale"]) * compositeSize["height"],
    'channels': 3
  }
  const backgroundBuffer = Buffer.alloc(backgroundRaw['width'] * backgroundRaw['height'] * backgroundRaw['channels'], 0x000000);
  let compositeBackground = await sharp(backgroundBuffer, { raw: backgroundRaw }).png().toBuffer();

  // Loop cards and composite them on background
  for (let i = 0; i < cards.length; i++) {

    let newCards = "";
    for (let j = 0; j < cards[i].length; j++) {
      if (cards[i][j] === '%') {
        newCards = cards[i].substring(j + 3);
        j = cards[i].length;
      }
    }
    console.log(newCards);
    // Get the card from scryfall to a buffer
    let cardBuffer = await new Promise(resolve => {
      https.get(`https://api.scryfall.com/cards/named?exact=${newCards}&format=image&version=border_crop`, res => {
        const chunks = [];
        res.on('data', chunk => { chunks.push(chunk); })
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        })
      }).end();
    })

    // Scale the card
    try{
      cardBuffer = await sharp(cardBuffer).resize({ width: card["width"] * card["scale"], kernel: sharp.kernel.cubic }).toBuffer();
    }
    catch(error)
    {
      console.log("Buffer image failed, throwing 404: " + error);
      response.statusCode = 404;
      response.end();
      return;
    }

    // Composite the card
    compositeBackground = await sharp(compositeBackground).composite([{
      input: cardBuffer,
      top: (i % compositeSize["height"]) * card["height"] * card["scale"],
      left: (Math.floor(i / compositeSize["width"])) * card["width"] * card["scale"],
    }]).png().toBuffer();
    console.log("x: ", Math.floor(i / compositeSize["width"]), "y: ", (i % compositeSize["height"]));

    // delay a second every 10 cards because of scryfall politely asking
    if (i < cards.length - 1) {
      await delay(100);
    }
  }

  var fileNameInt = randomUUID();
  var secondFileNameInt = randomUUID();

  const stream = Readable.from(compositeBackground);

  videoProcessor = ffmpeg().outputOptions([
    "-preset slow",
    "-codec:a libfdk_aac",
    "-b:a 128k",
    "-codec:v libx264",
    "-pix_fmt yuv420p",
    "-b:v 8M",
    "-vf scale=-1:-1",
  ]);//Boost -b:v higher to improve quality

  //   ,

  await new Promise((resolve) => {
    videoProcessor.input(stream)
      .noAudio()
      .output(`temp/${secondFileNameInt}.mp4`)
      .outputFPS(1)
      .on('end', resolve)
      .run()
  });

  //[0]trim=0:N[hold];[0][hold]concat[extended];[extended][0]overlay
  //[0:a]showfreqs=s=200x100:colors=white|white,format=yuv420p[vid]

  await new Promise((resolve) => {
    ffmpeg()
      .input(`temp/${secondFileNameInt}.mp4`)
      .complexFilter([
        {
          filter: "trim",
          options:  "0:20",
          inputs: "[0]",
          outputs: "[hold]"
        },
        {
          filter: "concat",
          inputs: "[0][hold]",
          outputs: "[extended]"
        },
        {
          filter: "overlay",
          inputs: "[extended][0]"
        },
      ])
      .output(`temp/${fileNameInt}.mp4`)
      .on('end', resolve)
      .run();
  });

  try {
    fs.unlinkSync(`temp/${secondFileNameInt}.mp4`);

    console.log("Delete Temp Temp video File");
  } catch (error) {
    console.log(error);
  }

  console.log("Hopefully processed the video, catching errors is for losers!");
  //200 or 206 not sure which
  response.writeHead(200, { 'Content-Type': 'video/mp4' })
  await delay(100);
  const videoStream = fs.createReadStream(`temp/${fileNameInt}.mp4`);
  videoStream.pipe(response);

  //could not figure out how to tell if the videostream was done, so instead I just have a hardcoded delay
  storeAndDelete(`temp/${fileNameInt}.mp4`, request.url);

  await delay(50);

  processing = false;

  response.end();

}).listen(8080);

console.log("starting host at: http://localhost:8080");

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

async function storeAndDelete(fileName, URLcall) {
  storedRequest.push(fileName)
  storedRequest.push(URLcall)
  console.log("storing processed URL for 10sec");
  await delay(10000)
  try {
    fs.unlinkSync(fileName);
    
    console.log("Delete Temp video File");
  } catch (error) {
    console.log(error);
  }
  const index = storedRequest.indexOf(fileName);
  if (index > -1) {
    storedRequest.splice(index, 2);
  }
}
