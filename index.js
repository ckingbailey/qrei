import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const base_url = 'https://rei.com/search'
const qs = 'q=approach+shoes?&ir=q:approach+shoes&r=category:mens-footwear;deals:See+All+Deals';

const response = await fetch(`${base_url}?${encodeURIComponent(qs)}`, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'
    }
});
const body = await response.text();

const dom = new JSDOM(body);

const results = dom.window.document.getElementById('search-results');

// get children of div#search-results
// get first <ul> from children
// get children of <ul>
// get all <li> children of <ul>
console.log(results);
