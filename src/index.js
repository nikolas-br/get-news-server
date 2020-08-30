import "dotenv/config"; // alwas has to be declared first
import express, { json } from "express";
import cors from "cors";
const Parser = require("rss-parser");
import { getArticle } from "./readability";
const fs = require("fs");
const path = require("path");

let port = process.env.PORT || 80;
let rssSourcesList = [];

const app = express();
app.use(cors());
app.use(express.json());

app.listen(port);
console.log("Listening on port " + port);

// Read json file with rss sources
fs.readFile(
  path.resolve("src", "rssSources.json"),
  "utf8",
  (err, jsonString) => {
    if (err) {
      console.log("Error reading file from disk:", err);
      return;
    }
    try {
      rssSourcesList = JSON.parse(jsonString);
      console.log("RSS sources loaded");
    } catch (err) {
      console.log("Error parsing JSON string:", err);
    }
  }
);

//////////////////////////////////////////////////////////////////////
// Get feeds
// Request:

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
  if (req.body.data.filter((element) => element.length === 0).length > 0) {
    res.send("Not allowed");
    return;
  }

  getFeeds(req.body.data).then((feeds) => {
    let consolidatedFeed = [];
    feeds.forEach(
      (feed) => (consolidatedFeed = [...consolidatedFeed, ...feed])
    );
    sortFeed(consolidatedFeed);
    console.log("Entries retrieved: ", consolidatedFeed.length);

    res.send(consolidatedFeed);
  });
});

//////////////////////////////////////////////////////////////////////
// Search feature
// Request: { data: {search: searchTerm, page: 0} };
// If page: -1 and the result needs to be paginated, the first page is sent
// Reponse: {data: [], totalPages: 0}
// If totalPages: 0, all results have been transmitted

app.post("/search", (req, res) => {
  const ELEMENTS_PER_PAGE = 10;

  if (typeof req.body.data.search !== "string") {
    res.send("Not allowed, search terms have to be a string");
    return;
  }
  if (typeof req.body.data.page !== "number") {
    res.send("Not allowed, page has to be a number");
    return;
  }

  const searchTerms = req.body.data.search;
  const page = req.body.data.page;
  console.log("/search request for: ", searchTerms, page);

  const filtered = searchFeeds(searchTerms);

  if (!filtered.length) {
    res.send({ data: [], totalPages: 0 });
    return;
  }

  // Check if pagination is needed
  const totalPages = Math.ceil(filtered.length / ELEMENTS_PER_PAGE);

  if (totalPages === 1) {
    res.send({ data: filtered, totalPages: 0 });
    return;
  }

  // Is the requested page number valid?
  if (page > totalPages) {
    res.send("Invalid page number");
    return;
  }

  const section = filtered.slice(
    ELEMENTS_PER_PAGE * page,
    ELEMENTS_PER_PAGE * (page + 1)
  );
  res.send({ data: section, totalPages });
});

const searchFeeds = (searchTerms) => {
  if (searchTerms.length < 3) return [];

  searchTerms = searchTerms
    .trim()
    .split(/\s+/)
    .filter((e) => e.length >= 2);

  return rssSourcesList.filter((e) => {
    const searchField = e.title + e.description + e.link;

    for (let term of searchTerms) {
      const regex = new RegExp(term, "ig");
      if (!regex.test(searchField)) return false;
    }
    return true;
  });
};

//////////////////////////////////////////////////////////////////////
// Readability feature, sends parsed article to client
// /getStory?page=URLtoArticle
app.get("/getStory", async (req, res) => {
  console.log("/getStory request");

  if (typeof req.query.page === "undefined") {
    res.send("Not allowed");
    return;
  }
  if (typeof req.query.page !== "string") {
    res.send("Not allowed, has to be a string");
    return;
  }

  getArticle(req.query.page)
    .then((article) => {
      res.send(article);
    })
    .catch((error) => {
      console.error(error);
      res.send("Error getting article");
    });
});

//////////////////////////////////////////////////////////////////////

const rssGetter = new Parser({ timeout: 2000 });

const getFeeds = async (feeds) => {
  let promises = [];

  for (let feedObj of feeds) promises.push(getFeed(feedObj));

  return Promise.all(promises);
};

const getFeed = async (feedObj) => {
  // Output of parseURL() below, which is then extracted by parseFeed()
  // feedUrl: 'https://www.reddit.com/.rss'
  // title: 'reddit: the front page of the internet'
  // description: ""
  // link: 'https://www.reddit.com/'
  // items:
  //     - title: 'The water is too deep, so he improvises'
  //       link: 'https://www.reddit.com/r/funny/comments/3skxqc/the_water_is_too_deep_so_he_improvises/'
  //       pubDate: 'Thu, 12 Nov 2015 21:16:39 +0000'
  //       creator: "John Doe"
  //       content: '<a href="http://example.com">this is a link</a> &amp; <b>this is bold text</b>'
  //       contentSnippet: 'this is a link & this is bold text'
  //       guid: 'https://www.reddit.com/r/funny/comments/3skxqc/the_water_is_too_deep_so_he_improvises/'
  //       categories:
  //           - funny
  //       isoDate: '2015-11-12T21:16:39.000Z'

  return new Promise((resolve, _) => {
    rssGetter.parseURL(feedObj.link, (err, res) => {
      if (err) {
        resolve([]);
      } else resolve(parseFeed(res, feedObj));
    });
  });
};

const parseFeed = (jsonFeed, feedObj) => {
  let newEntries = [];

  // Limit number of items
  jsonFeed.items = jsonFeed.items.slice(0, 500);

  const itemKeys = ["title", "description", "link", "pubDate", "category"];

  if ("items" in jsonFeed) {
    for (let item of jsonFeed["items"]) {
      let newEntry = {};

      for (let itmKey of itemKeys) {
        if (typeof item[itmKey] === "undefined")
          newEntry = { ...newEntry, [itmKey]: "" };
        else newEntry = { ...newEntry, [itmKey]: item[itmKey] };
      }

      //Change date to more readable format
      const date = new Date(newEntry.pubDate);
      newEntry.pubDate = date.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
          isRead: false,
        },
      ];
    }
  }

  return newEntries;
};

const sortFeed = (feed) => {
  feed.sort((a, b) => (Date.parse(a.pubDate) < Date.parse(b.pubDate) ? 1 : -1));
};
