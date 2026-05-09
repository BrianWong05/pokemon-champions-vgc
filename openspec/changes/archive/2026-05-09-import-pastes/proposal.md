## Why

Users often find competitive teams on external sites like pokepast.es or victoryroadvgc.com. Currently, they have to manually copy the Showdown text and paste it into the application. Automating this by allowing users to simply provide a URL will significantly improve the user experience.

## What Changes

- Add a URL input field in the Team Import modal.
- Implement server-side or client-side fetching logic to extract Showdown text from pokepast.es and Victory Road URLs.
- Integrate the fetched text into the existing Showdown import pipeline.

## Capabilities

### New Capabilities
- `import-from-url`: Ability to fetch and parse team data directly from pokepast.es and victoryroadvgc.com URLs.

### Modified Capabilities

## Impact

- `src/components/organisms/TeamShowdownImportModal.tsx`: Add URL input and "Fetch" logic.
- `src/services/paste-fetcher.ts`: New service to handle URL-specific extraction logic.
