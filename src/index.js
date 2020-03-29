import "dotenv/config"; // alwas has to be declared first
import express from "express";
import cors from "cors";
import Feed from "rss-to-json";

let port = process.env.PORT || 80;

const app = express();
app.use(cors());
app.use(express.json());

app.listen(port);
console.log("Listening on port " + port);

app.post("/get", async (req, res) => {
  console.log("Post request for: ", req.body.data);
  if (typeof req.body.data === "undefined") {
    res.send("Not allowed");
    return;
  }
  if (!Array.isArray(req.body.data)) {
    res.send("Not allowed");
    return;
  }
  if (req.body.data.filter(element => element.length === 0).length > 0) {
    res.send("Not allowed");
    return;
  }

  getFeeds(req.body.data).then(feeds => {
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

  for (let feedObj of feeds) promises.push(getFeed(feedObj));

  return Promise.all(promises);
};

const getFeed = async feedObj => {
  let promise = new Promise((resolve, reject) => {
    Feed.load(feedObj.link, (error, json) => {
      if (error != null) {
        console.error("Error getting feed: ", feedObj.link);
        resolve([]);
      } else resolve(parseFeed(json, feedObj));
    });
  });

  return promise;
};

const parseFeed = (jsonFeed, feedObj) => {
  let newEntries = [];

  const itemKeys = ["title", "description", "link", "pubDate", "category"];

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
          avatarThumbnail: feedObj.avatarThumbnail,
          avatarText: feedObj.avatarText,
          rootTitle: jsonFeed["title"],
          rootLink: feedObj.link,
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
