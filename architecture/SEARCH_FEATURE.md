## Phase 0: Catch All search algortihm
- [] **1.1** We need to be able to use scraper API to capture image, name and price for all links that are not amazon walmart and ebay. This function should be as dynamic as possible to adjust for multiple websites.
- [] **1.2** As a fallback to scraper api we can implemennt our own html scraper but only for links that are not amazon walmart and ebay.
- [] **1.3** The UI should reflect that our integration partners are amazon but they can shop from anywhere and request a link
- [] **1.4** We need a process to parse the product title from the url. Usually after www. com we should get the store name. If not we should get it from page title. If not we right Pending Product Details
- [] **1.5** We need a process for fallback for images, if image can be captured we show it, if not we Try OpenGraph image from URL, or else we put logo (which we can slowly build in our database and need a separate table for that), or else we fall back to generic product.
- [] **1.6** Same thing for price fallback if it does not work.
- [] **1.7** They should be able to add to the cart, we need them to approve each product not scraped from amazon ebay or walmart. If there is missing information, they should be able to do inline editing for that product url, price and name of product.
- [] **1.8** Admin integration
- [] **X** List of all our integration partners with prime integration partners 
- [] **Y** Handle scraping for amazon, ebay and walmart products where price is not lsited
- [] **Z** Searching amazon products replaced with searching *company* products, and we want to update the tag line every few seconds so the users know, extracting product info, extracting price info and taking longer than expected if the query is running too long, basically make it user friendlt









## Phase 1: Search Optimzation
- [] **1.1** Right now we have integration along amazon and will expand api to ebay and walmart for api, but we want users to be able to add any product and request it to us.

