const { extract, setSanitizeHtmlOptions } = require("article-parser");
const { JSDOM } = require("jsdom");

export const getArticle = async (url) => {
  setSanitizeHtmlOptions(articleParserConfig);

  try {
    const article = await extract(url);
    article.content = optimizeArticle(article);

    return article;
  } catch (err) {
    console.trace(err);
  }
};

const optimizeArticle = (article) => {
  // Wireframe template
  const { document } = new JSDOM(htmlWireframe).window;

  const articleElement = document.createElement("div");
  articleElement.classList = "article";
  articleElement.innerHTML = article.content;

  const betaWarning = document.createElement("div");
  betaWarning.classList = "betaWarning";
  betaWarning.innerHTML = betaWarningDefinition(article.url);

  const style = document.createElement("style");
  style.innerHTML = styleDefinition;

  document.body.appendChild(betaWarning);
  document.body.appendChild(articleElement);
  document.head.appendChild(style);
  document.title = article.title;

  // Remove social media links
  const socialMedia = /twitter|facebook|whatsapp|mail|messenger|share|teile|pocket|print|linkedin|xing/;
  Array.from(document.body.querySelectorAll("a")).forEach((node) => {
    if (socialMedia.test(node.innerHTML.toLowerCase())) node.remove();
  });

  // Remove multiple images the parser is prone to producing
  const imgSources = new Set();
  Array.from(document.querySelectorAll("img")).forEach((node) => {
    if (imgSources.has(node.src)) node.remove();
    else imgSources.add(node.src);
  });

  // Add title if there is none
  const rawInnerText = document
    .querySelector(".article")
    .innerHTML.toLowerCase()
    .replace(" ", "");
  const rawTitle = article.title.toLowerCase().replace(" ", "");
  if (!rawInnerText.includes(rawTitle)) {
    const newTitle = document.createElement("h2");
    newTitle.innerHTML = article.title;

    document
      .querySelector(".article")
      .insertBefore(newTitle, document.querySelector(".article").firstChild);
  }

  return document.documentElement.innerHTML;
};

const betaWarningDefinition = (url) => `
<strong>This is still a beta feature, the screen reader might not provide you with
the complete content. You can turn the reader off by clicking on the respective menu item (top right corner in the app).
</strong>
<br>
<br>
<a href="${url}">Click here to go to the original article</a>
`;

const styleDefinition = `        
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap");

* {
box-sizing: border-box;
font-family: "Playfair Display", serif;
}

body {
/* background-color: rgb(34, 34, 34); */
/* color: white; */
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
height: "100%";
width: "100%";
padding: 3%;
}

.article {
max-width: 800px;
font-size: 18px;
line-height: 1.5;
text-align: justify;
}

.article img {
max-width: 100%;
max-height: 100%;
margin-top: 20px;
margin-bottom: 20px;
display: block;
margin-left: auto;
margin-right: auto;
}

.article a {
color: grey;
}

.betaWarning {
color: red;
margin-bottom: 100;
}
`;

const articleParserConfig = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "u",
    "b",
    "i",
    "em",
    "strong",
    "div",
    "span",
    "p",
    "article",
    "blockquote",
    "section",
    "pre",
    "code",
    // "ul",
    "ol",
    // "li",
    "dd",
    "dl",
    "table",
    "th",
    "tr",
    "td",
    "thead",
    "tbody",
    "tfood",
    "label",
    "fieldset",
    "legend",
    "img",
    "picture",
    "br",
    "p",
    "hr",
    "a",
  ],
  allowedAttributes: {
    a: ["href"],
    img: ["src", "alt"],
  },
};

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
