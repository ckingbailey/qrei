/*
In general:
    - [x] Search rei website using query string
        - [x] Need query string class to assemble their peculiar qs
    - [] Parse results for product name, price, link
    - [] Send notification with list of products, prices, links
*/
import fetch from 'node-fetch';
import Handlebars from 'handlebars';
import { JSDOM } from 'jsdom';
import nodemailer from 'nodemailer';

const BASE_URL = 'https://rei.com/search'
const USER_AGENT = 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'
const FILTERS = [
    [ 'gender', 'Men\'s' ],
    // [ 'size', 10 ],
    [ 'deals', 'See+All+Deals' ]
];
const SEARCH_TERM = 'approach+shoes'
const MAIL_TEMPLATE = `<ul>
{{#results}}<li><a href='https://rei.com{{1}}'>{{0}}</a></li>{{/results}}
</ul>`;
const NODE_DEPTH_FLATTEN = 10;

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
        return Array.from(Array.from(results.children).filter(this.matchTag('ul'))[0].children)
            .filter(childElement => childElement.tagName.toLowerCase() === 'li')
            .map(li => (this.recurseNodes(li, htmlNode => ((htmlNode.textContent && htmlNode.nodeName !== '#comment')
                ? htmlNode.textContent
                : false))).flat(NODE_DEPTH_FLATTEN));
    }

    /**
     * Recurse into childNodes of node
     * returning an array containing nodeName and textContent of each one.
     * Returns an n-dimensional array of these 2-element arrays.
     * 
     * @param {Node} htmlNode A JSDOM Node object, just like the browser API Node object
     * 
     * @returns {Array}
     */
    recurseNodes(htmlNode, callback) {
        // base case, no children
        if (htmlNode.childNodes.length === 0) {
            return callback(htmlNode);
        }

        const nodeContent = Array.from(htmlNode.childNodes).map(childNode => this.recurseNodes(childNode, callback))
            .filter(Boolean);
        return nodeContent.length ? nodeContent : false;
    }
}

class Notifier {
    constructor(mail_config) {
        this.transporter = nodemailer.createTransport({
            host: mail_config.host,
            port: mail_config.port,
            secure: true,
            auth: {
                user: mail_config.username,
                pass: mail_config.password
            }
        });
        this.mail_from = mail_config.from;
        this.formatter = new Formatter()
    }

    async send(mail_to, searchResults) {
        console.log(mail_to);
        const html = this.formatter.formatHTML(searchResults);
        console.log(html);
        console.log(this.mail_from);
        return await this.transporter.sendMail({
            to: mail_to,
            from: this.mail_from,
            subject: `REI search results ${SEARCH_TERM}`,
            text: this.formatter.formatText(searchResults),
            html: html
        });
    }
}

class Formatter {
    constructor(template) {
        const source = template || MAIL_TEMPLATE;
        this.template = Handlebars.compile(source);
    }

    formatHTML(content) {
        const html = this.template(content);
        return html;
    }

    formatText(content) {
        return content.results.map(result => result.join('\n')).join('\n\n');
    }
}

async function main() {
    const query = new Query(SEARCH_TERM, new QueryFilter(...FILTERS));
    const qs = query.toString();
    console.log(qs);
    
    const rei = new ReiClient();
    const response = await rei.search(query);
    
    const body = await response.text();
    
    const scraper = new Scraper(body)
    const results = scraper.getResultsList()
    
    console.dir(results, { depth: 10 });

    // const notifier = new Notifier({
    //     host: 'mail.sonic.net',
    //     port: 465,
    //     secure: true,
    //     username: process.env['MAIL_USERNAME'],
    //     password: process.env['MAIL_PASSWORD'],
    //     from: process.env['MAIL_FROM']
    // });

    // const info = await notifier.send(
    //     process.env['MAIL_TO'],
    //     { results }
    // );
    // console.log(info);
}

main().catch(console.error);
