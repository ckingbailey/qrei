/*
In general:
    • Search rei website using query string
        • Need query string class to assemble their peculiar qs
    • Parse results for product name, price, link
    • Send notification with list of products, prices, links
*/
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const base_url = 'https://rei.com/search'
const filters = [
    [ 'gender', 'Men\'s' ],
    [ 'size', 10 ],
    [ 'deals', 'See+All+Deals' ]
];
const query = {
    q: 'approach+shoes',
    r: filters.map(f => f.join(encodeURIComponent(':'))).join(encodeURIComponent(';'))
};
const qs = Object.entries(query).map(q => q.join('=')).join('&');
console.log(qs)

const url = `${base_url}?${qs}`;
console.log(url)
const response = await fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'
    }
});

if (response.status !== 200) {
    throw Error(`${response.status}: ${response.statusText}`)
}

const body = await response.text();
const dom = new JSDOM(body);

const results = dom.window.document.getElementById('search-results');

// get children of div#search-results
// get first <ul> from children
// get children of <ul>
// get all <li> children of <ul>

// search for search results unordered list
let uls = [];
console.log('num results', results.children.length);
for (const childItem of results.children) {
    if (childItem.tagName.toLowerCase() === 'ul') {
        uls.push(childItem);
    }
}

// search of list items in first ul
let lis = [];
console.log('num children of ul 0', uls[0].children.length);
for (const childItem of uls[0].children) {
    if (childItem.tagName.toLowerCase() === 'li') {
        // Is there any advantage of children (HTMLCollection) vs. childNodes (NodeList)?
        // What is the difference in behavior of the 2 kinds of collections?
        const itemText = childItem.textContent;
        const links = new Set();
        for (const innerChild of childItem.children) {
            if (innerChild.tagName.toLowerCase() === 'a') {
                links.add(innerChild.href);
            }
        }
        if (links.size > 1) {
            console.warn(`Found more than 1 unique link for item ${itemText}`, links);
        }
        lis.push([ itemText, links.values().next().value ]);
    }
}

console.log(lis);
