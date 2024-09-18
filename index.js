/*
In general:
    • Search rei website using query string
        • Need query string class to assemble their peculiar qs
    • Parse results for product name, price, link
    • Send notification with list of products, prices, links
*/
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const BASE_URL = 'https://rei.com/search'
const USER_AGENT = 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'

class QueryFilter {
    constructor() {
        // Validate that arguments are all 2-item iterables
        this.filterList = arguments;
        this.pairJoiner = encodeURIComponent(':');
        this.filterListJoiner = encodeURIComponent(';');
    }

    toString() {
        return this.filterList.map(f => f.join(this.pairJoiner)).join(this.filterListJoiner);
    }
}

class Query {
    constructor(searchTerm, filters) {
        this.q = searchTerm;
        this.filters = filters;
    }

    toString() {
        return `q=${searchTerm}&r=${filters.toString()}`
    }
}

class ReiClient {
    constructor(base_url) {
        this.base_url = base_url || BASE_URL;
        this.fetch = fetch;
        this.headers = {
            'User-Agent': USER_AGENT
        };
    }

    async search(query) {
        url = `${this.base_url}?${query.toString()}`;
        res = await this.fetch(url, this.headers);
        // Handle undesirable response codes here.
        // How to handle 404, which is returned when no search results,
        // but maybe also returned for certain malformed requests?
        return await res.text();
    }
}

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
        'User-Agent': USER_AGENT
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
