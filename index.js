/*
In general:
    - [x] Search rei website using query string
        - [x] Need query string class to assemble their peculiar qs
    - [] Parse results for product name, price, link
    - [] Send notification with list of products, prices, links
*/
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import nodemailer from 'nodemailer';

const BASE_URL = 'https://rei.com/search'
const USER_AGENT = 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'

class QueryFilter {
    constructor() {
        // Validate that arguments are all 2-item iterables
        this.filterList = [ ...arguments ];
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
        return `q=${this.q}&r=${this.filters.toString()}`
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
        const url = `${this.base_url}?${query.toString()}`;
        console.log(url, this.headers)
        const res = await this.fetch(url, { headers: this.headers });
        // Handle undesirable response codes here.
        // How to handle 404, which is returned when no search results,
        // but maybe also returned for certain malformed requests?
        if (res.status !== 200) {
            throw Error(`${res.status} ${res.statusText}`)
        }

        return res;
    }
}

class Scraper {
    constructor(html, classname) {
        this.dom = new JSDOM(html);
        this.searchResultsClassname = classname || 'search-results';
    }

    matchTag(tag) {
        return (element) => element.tagName.toLowerCase() == tag;
    }

    getResultsList() {
        const results = this.dom.window.document.getElementById(this.searchResultsClassname);
        const hits = Array.from(Array.from(results.children).filter(this.matchTag('ul'))[0]
            .children).filter(this.matchTag('li')).map(li => {
                const text = li.textContent;
                const links = new Set(Array.from(li.children).filter(this.matchTag('a')).map(a => a.href));
                return [
                    text,
                    links.values().next().value
                ];
            })
        return hits;
    }
}

const FILTERS = [
    [ 'gender', 'Men\'s' ],
    // [ 'size', 10 ],
    [ 'deals', 'See+All+Deals' ]
];

const SEARCH_TERM = 'approach+shoes'

async function main() {
    const query = new Query(SEARCH_TERM, new QueryFilter(...FILTERS));
    const qs = query.toString();
    console.log(qs);
    
    const rei = new ReiClient();
    const response = await rei.search(query);
    
    const body = await response.text();
    
    const scraper = new Scraper(body)
    const results = scraper.getResultsList()
    
    console.log(results);
    
    const transporter = nodemailer.createTransport({
        host: 'mail.sonic.net',
        port: 465,
        secure: true,
        auth: {
            user: process.env['MAIL_USERNAME'],
            pass: process.env['MAIL_PASSWORD']
        }
    });

    const text = results.map(result => result.join('\n')).join('\n\n')
    const html = `<p>${text}<\p>`

    console.log(process.env['MAIL_USERNAME'])

    const info = await transporter.sendMail({
        from: process.env['MAIL_FROM'],
        to: process.env['MAIL_TO'],
        subject: `REI search results ${SEARCH_TERM}`,
        text: text,
        html: html
    })
}

main().catch(console.error);
