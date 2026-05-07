import os
import re
import cloudscraper
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Configuration
URL = "https://bulbapedia.bulbagarden.net/wiki/Mega_Stone"
SAVE_DIR = "mega_stones"

def download_mega_stones():
    # Create the directory if it doesn't exist
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)

    # Initialize Cloudscraper (this bypasses the 403 Forbidden error)
    scraper = cloudscraper.create_scraper(browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    })

    print(f"Fetching page HTML from {URL} (bypassing Cloudflare)...")
    
    try:
        response = scraper.get(URL)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch the main page. Cloudflare might still be blocking it: {e}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    images = soup.find_all('img')

    downloaded_count = 0

    # Regex to match the typical Mega Stone bag sprite filename
    target_pattern = re.compile(r'Bag_.*_Sprite\.png', re.IGNORECASE)

    for img in images:
        src = img.get('src')
        if not src:
            continue

        if target_pattern.search(src):
            # Handle protocol-relative URLs
            if src.startswith('//'):
                img_url = f"https:{src}"
            else:
                img_url = urljoin(URL, src)

            # Clean the filename
            raw_filename = src.split('/')[-1]
            clean_filename = re.sub(r'^\d+px-', '', raw_filename)
            filepath = os.path.join(SAVE_DIR, clean_filename)

            if os.path.exists(filepath):
                continue

            print(f"Downloading: {clean_filename}")
            try:
                # Use the scraper to download the actual image data too
                img_data = scraper.get(img_url).content
                with open(filepath, 'wb') as handler:
                    handler.write(img_data)
                downloaded_count += 1
            except Exception as e:
                print(f"Failed to download {img_url}: {e}")

    print(f"\nFinished! Successfully downloaded {downloaded_count} Mega Stone images into the './{SAVE_DIR}/' folder.")

if __name__ == "__main__":
    download_mega_stones()