# Google Search Console Setup Guide

This guide explains how to set up and verify your website with Google Search Console for improved SEO and visibility in Google search results.

## What is Google Search Console?

Google Search Console is a free web service by Google that helps you monitor, maintain, and troubleshoot your site's presence in Google Search results. It provides insights about your website's performance in search, including:

- How often your site appears in Google search results
- Which search queries bring users to your site
- How many visitors you get from Google search
- Which pages are most popular
- If Google has any problems crawling your site

## Step 1: Access Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/about)
2. Sign in with your Google account
3. Click "Start now"

## Step 2: Add Your Property

1. In the property selector, click "Add property"
2. Choose the property type:
   - Domain: For all URLs under a domain, including all subdomains and protocols (recommended)
   - URL prefix: For a specific URL (e.g., `https://example.com/`)

## Step 3: Verify Ownership Using DNS TXT Record (Recommended)

When using the Domain property type, you'll verify ownership through a DNS TXT record:

1. Google will provide a TXT record value that looks like: `google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
2. Log in to your domain registrar or DNS provider
3. Go to your domain's DNS settings and add a new TXT record:
   - Name/Host: @ or leave blank (root domain)
   - Value/Content: The full verification string starting with `google-site-verification=`
   - TTL: Default (usually 3600 or 1 hour)
4. Save the record
5. Go back to Google Search Console and click "Verify"
6. Wait for DNS propagation (can take 15 minutes to 24 hours)

## Step 4: Set Up Sitemap

1. After verification, go to "Sitemaps" in the left menu
2. Enter `sitemap.xml` in the field
3. Click "Submit"

## Step 5: Wait for Data

After verification, it may take a few days before you start seeing data in your Google Search Console dashboard.

## Important Notes

- Keep the TXT record in your DNS settings even after successful verification
- Check your Google Search Console regularly for any issues or improvements
- Submit new or updated sitemaps when you make significant changes to your site structure
- With the TXT verification method, you don't need to add any verification code to your website files

## Checking Your TXT Record

You can verify your TXT record is correctly set up using:
- [MXToolbox TXT Lookup](https://mxtoolbox.com/TXTLookup.aspx)
- [Google Admin Toolbox](https://toolbox.googleapps.com/apps/dig/#TXT/)

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Google's SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Submitting a Sitemap](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap) 