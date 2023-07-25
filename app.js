const http = require('http');
const https = require('https');
const sharp = require("sharp");
const fs = require('fs');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
//ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin');
const { type } = require('os');
const { randomUUID } = require('crypto');
/*const transformStream = require('stream')
const oggstream = new transformStream.Transform()*/

const cardScale = 0.5;
var processing = false;

const server = http.createServer();
server.on('request', async (request, response) => {

  const { method, url } = request;

  console.log("Someone is making a request from the server!");
  var cards = request.url.substring(1).split("/");
  console.log("request: " + request.url);

  if (cards.includes("favicon.ico")) {
    response.statusCode = 404;
    response.end();
    return;
  }
  var j = 0;
  while (processing) {
    if (j > 20) {
      response.statusCode = 404;
      response.end();
      return;
    }
    await delay(1000);
  }
  processing = true;

  const width = (480 * cardScale) * 15;
  const height = (680 * cardScale) * 15;
  const channels = 3;
  const rgbPixel = 0x000000;

  const canvas = Buffer.alloc(width * height * channels, rgbPixel);

  var sharpImage = await sharp(canvas, { raw: { width, height, channels } }).png().toBuffer();

  for (var i = 0; i < cards.length; i++) {

    let cardimageurl = await new Promise((resolve, reject) => {
      https.get(`https://api.scryfall.com/cards/named?exact=${cards[i]}&format=image&version=border_crop`, resp => {
        let data = '';

        console.log('reading from get', data.length, resp.headers['x-scryfall-card-image'])

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
          console.log('read from get', data.length, resp.headers['x-scryfall-card-image'])

          resolve(resp.headers['x-scryfall-card-image'])
        });
      })
    })

    //console.log("CardImageURL", cardimageurl);
    if (cardimageurl == undefined) {
      console.log("Incorrect file type given!");
      response.statusCode = 206;
      response.end();
      return;
    }

    let imagebuffer = await new Promise(resolve => {
      https.get(cardimageurl, respo => {
        var bufs = [];
        respo.on('data', function (d) { bufs.push(d); });
        respo.on('end', () => {
          var buf = Buffer.concat(bufs);
          console.log("Download Completed");
          resolve(buf);
        })
      })
    })

    curCard = await sharp(imagebuffer).resize({ width: 480 * cardScale, kernel: sharp.kernel.cubic }).toBuffer();

    sharpImage = await sharp(sharpImage).composite([
      {
        input: curCard,
        top: (i % 15) * 680 * cardScale,
        left: (Math.floor(i / 15)) * 480 * cardScale,
      },
    ]).png().toBuffer();
    console.log("x: ", Math.floor(i / 15), "y: ", (i % 15));

    //delay unless this was the last card
    if (i < cards.length - 1) {
      await delay(100);
    }
  }
  //await sharp(sharpImage).toFile("sucks.png");

  //  fs.writeFileSync(path.resolve(output, `${i}.${ext}`), imageStream)


  var fileNameInt = randomUUID();
  var secondFileNameInt = randomUUID();

  const stream = Readable.from(sharpImage);

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

/*oggstream._transform = function (data, encoding, done) {
  this.push(data)
  done()
}*/

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}
/*const http = require('http');
const https = require('https');
const sharp = require("sharp");
const fs = require('fs');
const { type } = require('os');

const cardScale = 0.5;

const server = http.createServer();
server.on('request', (request, response) => {
  // the same kind of magic happens here!
  const { method, url } = request;

  console.log("Someone is making a request from the server!");
  var cards = request.url.substring(1).split("/");
  console.log("request: "+request.url);
  if(!request.url.includes("app.js"))
  {
    if(!request.url.includes(".mp4"))
    {
      const width = (480*cardScale)*15;
      const height = (680*cardScale)*15;
      const channels = 3;
      const rgbPixel = 0x000000;
      
      const canvas = Buffer.alloc(width * height * channels, rgbPixel);
      var magicText;
      
      var image = sharp(canvas, { raw : { width, height, channels } });

      addCardImageLoop(0,image,cards);
    }
  }
}).listen(8080);

function addCardImageLoop(i, image, cards)
{
  setTimeout(function() {
    console.log("curCard: "+cards[i]);

    downloadImage(i,image,cards);

  }, 1000);
}

async function imageManipulation(i, image, cards) {
  curCard = await sharp("tempFile.jpg").resize({width:480*cardScale,kernel:sharp.kernel.cubic}).toBuffer();
  
  var x = image;
  console.log(Object.prototype.toString.call(image));

  await image.composite([
    {
      input: curCard,
      top: (i%15)*680*cardScale,
      left: (Math.floor(i/15))*480*cardScale,
    },
  ]);
  console.log("x: ", Math.floor(i/15), "y: ", (i%15));
  if((i>cards.length-1))
  {
    await image.toFile("sucks.png");
  }
  return image;
}

function downloadImage(i,image,cards)
{//${cards[i]}
   https.get(`https://api.scryfall.com/cards/named?exact=lightning_bolt&format=image&version=border_crop`, resp => {
    let data = '';

    // A chunk of data has been received.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      //console.log("Removed Json", resp.headers['x-scryfall-card-image']);

      const file = fs.createWriteStream("tempFile.jpg");
      https.get(resp.headers['x-scryfall-card-image'], respo => {
        respo.pipe(file);
    
        file.on("finish", async () => {

          file.close();
          console.log("Download Completed");
          image = await imageManipulation(i,image,cards);
          i++;
          if(i<cards.length)
          {
            addCardImageLoop(i,image,cards);
          }

        });
      });

    });

  });
}

console.log("starting host at: http://localhost:8080");

/*function downloadImage()
{//${cards[i]}
   https.get(`https://api.scryfall.com/cards/named?exact=lightning_bolt&format=image&version=border_crop`, resp => {
    let data = '';

    // A chunk of data has been received.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      console.log("Before File");
      
      const file = fs.createWriteStream("tempFile.jpg");
      https.get(resp.headers['x-scryfall-card-image'], respo => {
        console.log("Respo:::", respo);
        respo.pipe(file);
    
        file.on("finish", () => {
          file.close();
          console.log("Download Completed");
        });
      });
    });

  });
}*/
