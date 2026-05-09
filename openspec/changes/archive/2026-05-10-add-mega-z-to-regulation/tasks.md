## 1. Database Cleanup

- [x] 1.1 Remove Absol (Mega Z) [ID: 10307] from Regulation M-A in `format_pokemon` table
- [x] 1.2 Remove Garchomp (Mega Z) [ID: 10309] from Regulation M-A in `format_pokemon` table
- [x] 1.3 Remove Lucario (Mega Z) [ID: 10310] from Regulation M-A in `format_pokemon` table
- [x] 1.4 Remove Mega Raichu X [ID: 10304] from Regulation M-A in `format_pokemon` table
- [x] 1.5 Remove Mega Raichu Y [ID: 10305] from Regulation M-A in `format_pokemon` table

## 2. Scraper Hardening (Optional but Recommended)

- [x] 2.1 Update `scripts/scrape_regulation_m_a.py` or create a blacklist to prevent these IDs from being re-added in future scrapes

## 3. Verification

- [x] 3.1 Verify exclusion in Speed Tier List UI
- [x] 3.2 Verify exclusion in Damage Calculator search
- [x] 3.3 Verify database consistency (run SQL check)
