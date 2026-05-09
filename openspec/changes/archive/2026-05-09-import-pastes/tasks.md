## 1. Core Logic

- [x] 1.1 Implement `src/services/paste-fetcher.ts` with logic for Pokepaste and Victory Road
- [x] 1.2 Implement URL detection and source-specific fetching/extraction
- [x] 1.3 Add a proxy handling mechanism if needed (e.g., using a public CORS proxy)

## 2. UI Implementation

- [x] 2.1 Update `TeamShowdownImportModal.tsx` to include a URL input and a "Fetch" button
- [x] 2.2 Bind the fetch logic to the UI and update the textarea on success
- [x] 2.3 Implement error handling and loading states in the modal

## 3. Verification

- [x] 3.1 Verify import from a valid pokepast.es URL
- [x] 3.2 Verify import from a valid victoryroadvgc.com/pastes URL
- [x] 3.3 Verify error message for unsupported domains
