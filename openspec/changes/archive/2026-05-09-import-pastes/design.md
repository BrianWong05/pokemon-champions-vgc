## Context

Importing teams currently requires users to manually copy and paste Showdown text. Websites like pokepast.es and victoryroadvgc.com are the primary sources for these pastes.

## Goals / Non-Goals

**Goals:**
- Support pokepast.es URLs (including automatic conversion to /raw).
- Support victoryroadvgc.com/pastes/ URLs.
- Fetch the Showdown text and populate the import modal automatically.

**Non-Goals:**
- Supporting all possible Pokémon websites (limit to these two for now).
- Handling private pastes that require authentication.

## Decisions

- **URL Detection:** Implement logic to detect the source based on the domain (pokepast.es or victoryroadvgc.com).
- **Pokepaste Logic:** Automatically append `/raw` to pokepast.es URLs to get the plain text directly.
- **Victory Road Logic:** Fetch the HTML and use a regex or DOM parser to extract the `<code>` or `<pre>` block containing the Showdown text.
- **CORS Handling:** Since client-side fetch will likely fail due to CORS, I will implement a proxy service (or recommend a public one like `cors-anywhere` for the prototype, or use a Netlify/Vercel function if applicable). For this project, I'll try to find a way to fetch it directly or via a simple utility.

## Risks / Trade-offs

- **CORS Restrictions:** Most sites block direct cross-origin fetches.
    - [Risk] Fetching fails in the browser.
    - [Mitigation] Provide a clear error message and fall back to manual copy-paste.
- **HTML Structure Changes:** Victory Road might change their HTML.
    - [Risk] Extraction logic breaks.
    - [Mitigation] Use robust regex and keep the logic modular for easy updates.
