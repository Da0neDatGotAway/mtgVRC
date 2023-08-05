// Includes
"use strict";
require("dotenv").config({ path: require("find-config")(".env") });
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const express = require("express");
const nocache = require("nocache");
const { v4: uuidv4 } = require("uuid");
const app = express();
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const encode = require("./modules/encode.js");
const { json } = require("express");

// Config
const outPath = path.join(__dirname, "TMP");
let config = {
  dataFormat: process.env.DATA_FORMAT || "json",
  keepArtifacts:
    process.env.KEEP_ARTIFACTS?.toLowerCase().trim() === "true" ? true : false,
  port: process.env.PORT || 9999,
  encodingMethod: process.env.ENCODING_TYPE || "BINARY",
  b64: process.env.B64 === "false" ? false : true || true,
  size:
    process.env.WIDTH || process.env.HEIGHT
      ? {
          width: process.env.WIDTH || 128,
          height: process.env.HEIGHT || 128,
        }
      : "auto",
  outPath,
};
if (!config.keepArtifacts) fs.rmSync(outPath, { recursive: true, force: true });
if (!fs.existsSync(outPath)) {
  fs.mkdir(outPath, (err) => {
    if (err) console.error(err);
  });
}
console.log("--------------------------------");
console.log(`| Hello PixelProxy!`);
console.log("--------------------------------");
console.log(`| PORT: ${config.port}`);
console.log(`| FORMAT: ${config.dataFormat}`);
console.log(`| METHOD: ${config.encodingMethod}`);
console.log(`| SIZE: ${JSON.stringify(config.size)}`);
console.log(`| KEEP ARTIFACTS: ${config.keepArtifacts}`);
console.log("--------------------------------");

// Init
ffmpeg.setFfmpegPath(ffmpegPath);
app.use(cors());
app.use(nocache());
app.use(express.json());
app.engine("html", require("ejs").renderFile);
app.listen(config.port);
app.use(express.static("public"));

// Routing
app.get("/", (req, res) => {
  if (!req.query.url) {
    if (process.env.HELP_URL) {
      res.redirect(301, process.env.HELP_URL);
    } else {
      res.sendStatus(400);
    }
    return;
  }

  const endpoint = req.query.url;
  const auth = req.query.auth || null;

  // rt (return type)
  const rt = req.query.rt || "mp4";

  // df (data format)
  const df = req.query.df || null;
  if (df) {
    config = { ...config, dataFormat: df };
  }

  // et (encoding type)
  const et = req.query.et || null;
  if (et) {
    config = { ...config, encodingMethod: et };
  }

  // b64 (encoding type)
  const b64 = req.query.b64 || true;
  if (b64) {
    config = { ...config, b64: b64 === "true" ? true : false };
  }

  // Zip compression (overrides b64)
  const zip = req.query.zip || true;
  if (zip) {
    config = { ...config, applyCompression: zip === "true" ? true : false };
  }

  const _removeArtifacts = () => {
    if (!config.keepArtifacts)
      fs.rmSync(config.outPath, { recursive: true, force: true });
  };

  if (process.env.AUTH_KEY && auth !== process.env.AUTH_KEY) {
    res.sendStatus(403);
    return;
  }

  config = { ...config, outPath: `${outPath}/${uuidv4()}` };
  if (!fs.existsSync(config.outPath)) {
    fs.mkdir(config.outPath, (err) => {
      if (err) console.error(err);
    });
  }

  if (!endpoint || !endpoint.includes("http")) {
    res.status(400).send("Bad Request");
  } else {
    const encodeDataFrom = (endpoint, cb) => {
      fetch(endpoint)
        .then((res) => res.json())
        .then((payload) => {
          switch (config.encodingMethod) {
            case "NAIVE_COLOR":
              encode.naiveColor(config, payload, cb);
              break;
            case "BINARY":
            default:
              encode.binary(config, payload, cb);
              break;
          }
        })
        .catch((error) => {
          console.error(error);
          res.status(400).send("Bad Request");
        });
    };
    console.log(`REQ: ${endpoint}`);

    encodeDataFrom(endpoint, (result) => {
      switch (rt) {
        case "json":
          res.send(result.json);
          break;
        case "b64":
          res.send(result.b64);
          break;
        case "xml":
          res.send(result.xml);
          break;
        case "bmp":
          res.sendFile(result.bmp, _removeArtifacts);
          break;
        case "mp4":
          res.sendFile(result.mp4, _removeArtifacts);
        default:
          break;
      }
    });
  }
});
app.get("/favicon.ico", (req, res) => res.status(204));
app.get("*", (req, res) => {
  res.sendStatus(403);
});
