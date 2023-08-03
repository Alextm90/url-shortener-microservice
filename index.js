// Requirements
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("node:dns");

// add mongoose + MongDB and connect
const mongo = require("mongodb");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use("/public", express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({ extended: true }));

// create mongoose schema + model
const schema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: Number, required: true, unique: true },
});
const URLModel = mongoose.model("url", schema);

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// get request for short_url to navigate to website
app.get("/api/shorturl/:short_url", (req, res) => {
  const short_url = req.params.short_url;
  // find the original url from the database and redirect to it
  URLModel.findOne({ short_url })
    .then((objFound) => {
      if (objFound) {
        let original_url = objFound.original_url;
        res.redirect(original_url);
      } else {
        res.json({ error: "We don't have that url in our database" });
      }
    })
    .catch((error) => res.json({ error: error }));
});

// post request for url to database
app.post("/api/shorturl", (req, res) => {
  let short_url = 1;
  url = new URL(req.body.url);

  dns.lookup(url.hostname, (err, address, family) => {
    if (!address) {
      // if address doesn't exist
      res.json({ error: "invalid url" });
    }
    // if address exists
    else {
      // check if entry already existst in database
      const original_url = url.href;
      URLModel.findOne({ original_url })
        .then((objFound) => {
          if (objFound) {
            res.json({
              original_url: objFound.original_url,
              short_url: objFound.short_url,
            });
          } else {
            // get the latest short_url and increment
            URLModel.find({})
              .sort({ _id: "desc" })
              .limit(1)
              .then((prevURL) => {
                if (prevURL.length) {
                  short_url = prevURL[0].short_url + 1;
                }
                // create an entry in the database + save
                const newURL = new URLModel({
                  original_url: original_url,
                  short_url: short_url,
                }).save();
                res.json({ original_url: original_url, short_url: short_url });
              })
              .catch((error) => res.json({ error: error }));
          }
        })
        .catch((error) => res.json({ error: error }));
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
