const craigslist = require('node-craigslist');
console.log("Creating client.");

let client = new craigslist.Client({
  city: 'pittsburgh'
});
client.search({
        category: 'apa'
      }, "2br")
      .then((listings) => client.details(listings[0]))
      .then((details) => console.log(details))
      .catch((err) => {
        console.error(err);
      });
