## Phase 0: Catch All search algortihm
- [x] **1.1** We need to be able to use scraper API to capture image, name and price for all links that are not amazon walmart and ebay. This function should be as dynamic as possible to adjust for multiple websites.
- [x] **1.2** As a fallback to scraper api we can implemennt our own html scraper but only for links that are not amazon walmart and ebay.
- [x] **1.3** The UI should reflect that our integration partners are amazon, (walmart and ebay coming soon) but they can shop from anywhere and request a link
- [x] **1.4** We need a process to parse the product title from the url. Usually after www. com we should get the store name. If not we should get it from page title. If not we right Pending Product Details
- [x] **1.5** We need a process for fallback for images, if image can be captured we show it, if not we Try OpenGraph image from URL, or else we put logo, or else we fall back to generic product.
- [x] **1.6** Same thing for price fallback if it does not work.
- [x] **1.7** They should be able to add to the cart, we need them to approve each product not scraped from amazon ebay or walmart. If there is missing information, they should be able to do inline editing for that product url, price and name of product.
- [x] **1.8** If for some reason we cannot find any information we should have a case for that as well
- [] **1.9** Manual URL implementation (We can look up this product for but it will probably take a while, manual entry instead?), cache popular producst?
- [] **1.10** Admin integration, ability to upload images ourselves
- [] **1.11** Email integration
- [] **W** Image storing optimization (?)
- [] **X** List of all our integration partners with prime integration partners 
- [] **Y** Handle scraping for amazon, ebay and walmart products where price is not lsited
- [] **Z** Searching amazon products replaced with searching *company* products, and we want to update the tag line every few seconds so the users know, extracting product info, extracting price info and taking longer than expected if the query is running too long, basically make it user friendlt
- [] **Different feature** We should add a carouself of products,  a list of all the countries we are serving from in our about page and what are our prime integration partnners. Explanation prime integration partners are ones that we have a direct relationship from, can source products and urls (like amazon), and then we have integration partners which might one day be upgrade but other websites
- [] **Different feature** Performance
- [x] **Different feature** Review scraper api architecture and make it scalable
- [ ] **Different feature** Separate hidden search page
- [ ] **Different feature** 


## Phase 1: Multi-Tier Scraping Strategy
- [] **2.1** Store classification system: Amazon (specific scraper), Nike/Target/Walmart/eBay (universal scraper), Others (manual queue)
- [] **2.2** Enhanced user messaging with processing time estimates and fallback options during long scraping, especially for universal scraping. For example, the circle loading is now amazon color orange, maybe we make it different. It also says searching amazon products when it should be the store name we extract
- [] **2.3** Implement manual entry flow within the UI, once the user enters the link they should be told it is not a prime integration partner in a nice way and that we captured their url, they can add the product price (in usd or bdt) and add to cart, we convert to bdt anyways. The picture can be whatever we extract from the url. Lets say for carter we have the logo we use logo, for newegg, we just write the name newegg. This process should be fast. For UI please follow the same conventions we have done for other stores and univesral as much as possible.
- [] **2.3** Checks for product price being 0, it should not be 0. 
- [] **2.4** Admin integration
- [] **2.5** Gradual migration framework to move stores from universal to custom scrapers with A/B testing

## Phase 2: Separate search page







## Phase 2: Search Optimization
- [] **1.1** Right now we have integration along amazon and will expand api to ebay and walmart for api, but we want users to be able to add any product and request it to us.

