import "dotenv/config"; // alwas has to be declared first
import express from "express";
import cors from "cors";
import Feed from "rss-to-json";

let port = process.env.PORT || 80;

const app = express();
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.listen(port);
console.log("Listening on port " + port);

app.post("/get", async (req, res) => {
  console.log("Post request for: ", req.body.url);
  if (typeof req.body.url === "undefined") {
    res.send("Not allowed");
    return;
  }
  if (!Array.isArray(req.body.url)) {
    res.send("Not allowed");
    return;
  }
  if (req.body.url.filter(element => element.length === 0).length > 0) {
    res.send("Not allowed");
    return;
  }

  getFeeds(req.body.url).then(feeds => {
    let consolidatedFeed = [];
    feeds.forEach(feed => (consolidatedFeed = [...consolidatedFeed, ...feed]));
    sortFeed(consolidatedFeed);
    console.log("Entries retrieved: ", consolidatedFeed.length);

    res.send(consolidatedFeed);
  });
});

//////////////////////////////////////////////////////////////////////

const getFeeds = async feeds => {
  let promises = [];

  for (let feed of feeds) promises.push(getFeed(feed));

  return Promise.all(promises);
};

const getFeed = async feed => {
  let promise = new Promise((resolve, reject) => {
    Feed.load(feed, (error, json) => {
      if (error != null) {
        console.error("Error getting feed: ", feed);
        resolve([]);
      } else resolve(parseFeed(json, feed));
    });
  });

  return promise;
};

const parseFeed = (jsonFeed, url) => {
  let newFeed = {};
  let newEntries = [];
  let avatarThumbnail = "";

  const channelKeys = ["description", "title", "image", "category", "url"];
  const itemKeys = ["title", "description", "link", "pubDate", "category"];

  // Get link for special thumbnail, if part of the default list of feeds
  for (let item of feedListDrawerTemplate) {
    if (item.id === url) avatarThumbnail = item.thumbnail;
  }

  if ("items" in jsonFeed) {
    for (let item of jsonFeed["items"]) {
      let newEntry = {};

      for (let itmKey of itemKeys) {
        if (typeof item[itmKey] === "undefined")
          newEntry = { ...newEntry, [itmKey]: "" };
        else newEntry = { ...newEntry, [itmKey]: item[itmKey] };
      }

      //Filter out description of items if they contain meta data
      if (newEntry.description.includes("<")) newEntry.description = "";
      //Change date to more readable format
      const date = new Date(newEntry.pubDate);
      newEntry.pubDate = date.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      //Add new item to array of stories, add values for app functions
      newEntries = [
        ...newEntries,
        {
          ...newEntry,
          isFavorite: false,
          avatarThumbnail: avatarThumbnail,
          // avatarText: avatarName,
          rootTitle: jsonFeed["title"],
          rootLink: url,
          isRead: false
        }
      ];
    }
  }

  return newEntries;
};

const sortFeed = feed => {
  feed.sort((a, b) => (Date.parse(a.pubDate) < Date.parse(b.pubDate) ? 1 : -1));
};

const feedListDrawerTemplate = [
  {
    name: "NZZ  - Startseite",
    avatarName: "NZZ",
    thumbnail:
      "https://pbs.twimg.com/profile_images/1006460634236628992/dc1hsh9d.jpg",
    id: "https://www.nzz.ch/startseite.rss"
  },
  {
    name: "FAZ - Aktuell",
    avatarName: "FAZ",
    thumbnail:
      "https://pbs.twimg.com/profile_images/1177121016524550145/KJESjKrB_400x400.jpg",
    id: "https://www.faz.net/rss/aktuell/"
  },
  {
    name: "Welt - Politik",
    avatarName: "W",
    thumbnail:
      "https://pbs.twimg.com/profile_images/775627854293954561/Y4iLEu_V_400x400.jpg",
    id: "https://www.welt.de/feeds/section/politik.rss"
  },
  {
    name: "Welt - Wirtschaft",
    avatarName: "W",
    thumbnail:
      "https://pbs.twimg.com/profile_images/775627854293954561/Y4iLEu_V_400x400.jpg",
    id: "https://www.welt.de/feeds/section/wirtschaft.rss"
  },
  {
    name: "Süddeutsche Zeitung - Topthemen",
    avatarName: "SZ",
    thumbnail:
      "https://pbs.twimg.com/profile_images/655020120121712640/WcX4aKls.png",
    id: "https://rss.sueddeutsche.de/rss/Topthemen"
  },

  {
    name: "Spiegel",
    avatarName: "S",
    thumbnail:
      "https://pbs.twimg.com/profile_images/1214723509521387520/7UENeEVp_400x400.jpg",
    id: "https://www.spiegel.de/schlagzeilen/index.rss"
  },

  {
    name: "New York Times - Homepage",
    avatarName: "NYT",
    thumbnail:
      "https://pbs.twimg.com/profile_images/1098244578472280064/gjkVMelR_400x400.png",
    id: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
  }
];
