const craigslist = require('node-craigslist');
const fs = require('fs');

let dayInMs = 86400000;
let getLatLngFromGoogleLinkRegex = /@(.*),/;

console.log("Creating client.");

let client = new craigslist.Client({
  city: 'pittsburgh'
});

// Use one timeoutObj to clean up nicely later
var timeoutObj;
// Frequency in seconds
var frequency = 300000;
// Stores the time of the previous call
var lastClearTime = Date.now();
// List of pids from today
var todayPids = [];

// Cleans an input to escape commas for csv
var csvClean = function(input) {
  var result = input.replace(/"/g, '"""');
  return '"' + result + '"';
}

var getListings = function() {
  // Clear the PIDs each day
  // TODO pidlist clearing is disabled for now
  var currentTime = Date.now();
  if (currentTime - lastClearTime > dayInMs) {
    // todayPids = [];
    lastClearTime = currentTime;
  }

  var jsdate = new Date(currentTime);
  var month = jsdate.getMonth() + 1;
  var formattedDate = month + "/" + jsdate.getDate() + "/" + jsdate.getFullYear() + " " + jsdate.getHours() + ":" + jsdate.getMinutes();

  console.log("Running getListings at " + formattedDate + ".");

  // TODO add more search options e.g. cost
  //https://pittsburgh.craigslist.org/search/apa?postedToday=1&max_price=2000&min_bedrooms=2&availabilityMode=0&sale_date=all+dates
  client.search({
          category: 'apa',
          maxPrice: '2000',
          postal: '15211',
          searchDistance: '3'
        }, "2br") // TODO update from just adding 2br to an actual query if possible
        .then((listings) => {
          listings.forEach((listing) => {
            // Only execute for PIDs not already visited
            if (!todayPids.includes(listing["pid"])) {

              // Get more info on this listing
              var details = client.details(listing).then((details) => {
                // TODO add another IF here that checks for distance from 1 or more lat/lng pairs
                // Build line of csv
                var line = formattedDate + "," + csvClean(listing["url"]) + "," + csvClean(listing["title"]) + "," + csvClean(details["mapUrl"]) + "\n";

                fs.appendFile('results.csv', line, function (err) {
                  if (err) console.log("Error writing to results.csv");
                  else {
                    console.log("Wrote to results.csv");
                    // Only save to todayPids if we successfully wrote.
                    todayPids.push(listing["pid"]);
                  }
                });
              })
              .catch((err) => {
                console.error("Error getting details for listing: " + listing);
                console.error(err);
              })
            }
          });

          // Set it up to go again
          timeoutObj = setTimeout(() => {
            getListings();
          }, frequency);
        })
        .catch((err) => {
          console.error("Error getting listings");
          console.error(err);
          // Set it up to go again
          timeoutObj = setTimeout(() => {
            getListings();
          }, frequency);
        });
}

// Start the recurring process
timeoutObj = getListings();

// Exit gracefully
process.on('exit', (code) => {
  console.log("Received exit with code ${code}. Canceling next operation and exiting.")
  clearTimeout(timeoutObj);
})

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  clearTimeout(timeoutObj);
  process.exit();
})


//process.exit(0);
