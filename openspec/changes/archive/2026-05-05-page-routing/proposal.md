## Why

The application currently lacks a way to navigate between different views (pages) without reloading the browser. We need a routing mechanism to support a multi-page experience (e.g., Damage Calculator, EV/SP Converter, Speed Tier List) while maintaining the performance benefits of a Single Page Application (SPA). This solves the problem of having all components crammed into a single view or relying on ad-hoc state-based view switching.

## What Changes

- Introduce a robust client-side routing solution (`react-router-dom`).
- Set up a main application layout with a navigation menu to switch between different tools.
- Extract existing tools into distinct, routable pages.
- Handle fallback routes (e.g., 404 Not Found).

## Capabilities

### New Capabilities
- `page-routing`: Client-side routing to manage navigation between different application views seamlessly.

### Modified Capabilities
- (None)

## Impact

- **Code:** `App.tsx` and `main.tsx` will be refactored to wrap the application in a router provider.
- **UI:** A persistent navigation layout (like a header or sidebar) will be added to the main entry point to allow users to switch pages.
- **Architecture:** The application will formally adopt a page-based architecture using `react-router-dom`.