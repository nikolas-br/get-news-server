const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");
const fetch = require("node-fetch");

export const getArticle = async (url) => {
  const res = await fetch(url)
    .then((res) => res.text())
    .catch((err) => {
      console.error(err);
      return;
    });

  const { document } = new JSDOM(res).window;

  // Remove unwanted elements
  document.querySelectorAll("svg").forEach((e) => e.remove());
  document.querySelectorAll("img").forEach((e) => e.remove());
  document.querySelectorAll("video").forEach((e) => e.remove());

  const reader = new Readability(document);
  const article = reader.parse();

  const newPage = new JSDOM(article.content).window.document;

  // Add styles
  const styles = newPage.createElement("style");
  styles.innerHTML = articleStyle;
  newPage.head.appendChild(styles);

  // Add title
  const title = newPage.createElement("h1");
  title.innerHTML = article.title;
  newPage.body.insertBefore(title, newPage.body.firstChild);
  newPage.title = article.title;

  // Add link to fill webpage
  const originalLink = newPage.createElement("a");
  originalLink.innerHTML = "Go to webpage";
  originalLink.href = url;
  originalLink.className = "originalLink";
  newPage.body.insertBefore(originalLink, newPage.body.firstChild);

  // Change relative to absolute links
  const rootURL = url.match(/(?<rootURL>http[s]?:\/\/www\..+?)\//).groups
    .rootURL;
  newPage.querySelectorAll("a").forEach((e) => {
    if (e.href.charAt(0) === "/") {
      e.href = rootURL + e.href;
    }
  });

  return newPage.documentElement.innerHTML;
};

const articleStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400;1,500&display=swap');

  * {
    font-family: 'Roboto', sans-serif;
  }

  body {
    text-align: center;
  }

  h1 {
    max-width: 900px;
    margin: auto;
    padding: 2%;
    line-height: 1.5;
    text-align: center;
    font-size: 1.5rem;
  }

  .originalLink {
    font-size: 1.2rem;
    margin: 30px;
  }

.page  {
  font-size: 1.15rem;
  line-height: 1.5;
  text-align: justify;
  max-width: 900px;
  margin: auto;
  padding: 2%;
}

.page * {
  text-align: justify;

}

.page h1, h2, h3, h4, h5, h6 {
  font-size: 1.25rem;
}`;

const htmlWireframe = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
  </head>
  <body>
    
  </body>
  </html>`;
