const express = require('express'),
      mongo = require('mongodb'),
      mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      AutoIncrement = require('mongoose-sequence')(mongoose),
      bodyParser = require('body-parser'),
      dns = require('dns');

require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGO_URI);

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => res.sendFile(process.cwd() + '/views/index.html'));

const urlSchema = new Schema({
  original_url: {
    type: String,
    required: true
  }
});

urlSchema.plugin(AutoIncrement, { inc_field: 'short_url' });
const URL = mongoose.model('URL', urlSchema);

const validateURL = (domain, res) => {
  const prefix = /^http[s]?:\/\//;
  const www = /^www./;
  
  let newUrl = domain.trim();
  
  if (prefix.test(newUrl)) {
    newUrl = newUrl.replace(prefix, '');
  };
  
  if (!www.test(newUrl)) {
    newUrl = 'www.' + newUrl;
  }
              
  dns.lookup(newUrl, (err, address, family) => {
    if (err) {
      console.log(err);
      res.json({ error: 'Invalid URL' });
    } else {
      URL.findOne({ original_url: newUrl }, (err, data) => {
        if(err) {
          return console.log(err);
        }

        if(data) {
          res.json({
            original_url: data.original_url,
            short_url: data.short_url
          });
        } else {
          const url = new URL({ original_url: newUrl});
          url.save((err, data) => err ? console.log(err) : res.json(data));
        }
      });
    }
  });
};

app.post('/api/shorturl/new', (req, res) => {
  validateURL(req.body.url, res);
});

app.get('/api/shorturl/:short_url', (req, res) => {
  URL.findOne({short_url: req.params.short_url}, (err, url) => {
    if(err) {
      res.send(err);
    } else {
      url ? res.redirect('http://' + url.original_url) : res.status(404).send('Shortened url could not be found.');
    }
  });    
});

app.listen(3000, () => {
  console.log(`Listening on port 3000`);
});