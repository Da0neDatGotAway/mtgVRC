const http = require('http');
const https = require('follow-redirects').https;
const sharp = require('sharp');
const fs = require('fs');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const { randomUUID } = require('crypto');

const card = { 'width': 480, 'height': 680, 'scale': 0.5 };
const compositeSize = {'width': 15, 'height': 15};
let processing = false;

const server = http.createServer();
server.on('request', async (request, response) => {

  console.log("Someone is making a request from the server!");
  console.log("request: " + request.url);

  // Array of the requested card names
  let cards = request.url.substring(1).split("/");

  // Terminate a favicon request TODO: change this to terminate any non-card requests
  if (cards.includes("favicon.ico")) {
    response.statusCode = 400;
    response.end();
    return;
  }

  // Terminate if still processing after 20 seconds
  for (let i = 0; processing && i < 20; i++) { await delay(1000); }
  if (processing) {
    response.statusCode = 408;
    response.end();
    return;
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

    // Get the card from scryfall to a buffer
    let cardBuffer = await new Promise(resolve => {
      https.get(`https://api.scryfall.com/cards/named?exact=${cards[i]}&format=image&version=border_crop`, res => {
        const chunks = [];
        res.on('data', chunk => { chunks.push(chunk); })
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        })
      }).end();
    })

    // Scale the card
    cardBuffer = await sharp(cardBuffer).resize({ width: card["width"] * card["scale"], kernel: sharp.kernel.cubic }).toBuffer();

    // Composite the card
    compositeBackground = await sharp(compositeBackground).composite([{
        input: cardBuffer,
        top: (i % compositeSize["height"]) * card["height"] * card["scale"],
        left: (Math.floor(i / compositeSize["width"])) * card["width"] * card["scale"],
      }]).png().toBuffer();
    console.log("x: ", Math.floor(i / compositeSize["width"]), "y: ", (i % compositeSize["height"]));

    // delay a second every 10 cards because of scryfall politely asking
    if (i % 10 === 0) {
      await delay(1000);
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
      .outputFPS(30)
      .on('end', resolve)
      .run()
  });
  
  await new Promise((resolve) => {
    ffmpeg()
    .input(`temp/${secondFileNameInt}.mp4`)
    .outputOptions('-vf tpad=stop_mode=clone:stop_duration=2')
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

  const videoStream = fs.createReadStream(`temp/${fileNameInt}.mp4`);
  videoStream.pipe(response);

  //could not figure out how to tell if the videostream was done, so instead I just have a hardcoded delay
  await delay(2000);

  try {
    fs.unlinkSync(`temp/${fileNameInt}.mp4`);

    console.log("Delete Temp video File");
  } catch (error) {
    console.log(error);
  }

  processing = false;

  response.end();

}).listen(8080);

console.log("starting host at: http://localhost:8080");

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}
