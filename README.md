# Gallery-Tools
Tools for scraping image galleries - specifically Furaffinity at this time


## Scraper
Written in javascript to be run as a user script. May eventually be ported to an extension or electron app. Scrapes select gallery pages retrieving submission image urls and optionally related metadata in a json format.

V2 is the rewrite and doesn't currently function, but hopefully will soon. It won't actually look or function much differently from v1, but will be much easier to maintain and update.

## Scripts
A random assortment of scripts written in javascript and Lua used for processing metadata in different ways. I wouldn't consider much of it useful to most. 

## Lightroom plugin
Actually fairly useful, once installed the json generated by the scraper can be loaded into it and apply metadata to the matching images in the catalog. I did write an alternative method to apply metadata using ExifTool which I could share, just need to make sure it 100% works and simplify the process a little... it's actually pretty simple.
