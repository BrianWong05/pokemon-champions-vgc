# Landscape Team Preview

The landscape Teams detail pane is a preview, so it will expose no Pokémon scanning actions.

The header **Scan Pokémon** button and `onScanPlayer` prop will be removed. Missing members will render as passive **Empty slot** placeholders instead of clickable **Scan** buttons. Team changes remain available through the existing Edit action, while Export and Delete are unchanged.

A focused component test will verify that neither **Scan Pokémon** nor **Scan** buttons are present and that empty slots are labeled. No scanning or creation code outside this preview component will change.
