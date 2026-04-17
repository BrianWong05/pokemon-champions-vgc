## Context

The application needs to fetch Pokémon data specifically for the "Regulation M-A" format. The data fetching layer must handle joining multiple tables (`pokemon`, `format_pokemon`, `formats`) and perform post-processing to calculate custom speed benchmarks based on the project's unique "SP" formula.

## Goals / Non-Goals

**Goals:**
- Implement a type-safe data fetching function using Drizzle ORM.
- Efficiently query only Pokémon legal in "Regulation M-A".
- Perform speed benchmark calculations in the service layer before returning data to the frontend.
- Return a structure optimized for the Speed Tier component.

**Non-Goals:**
- Real-time stat modification or persistent user-defined "SP" allocations (this is a reference fetch).
- Complex caching strategies (out of scope for this initial implementation).

## Decisions

- **ORM Usage**: We will use Drizzle's relational query API or standard select with joins for clarity and performance.
- **Stat Formula**: The speed benchmarks will be calculated using `Math.floor((Base + 20 + SP) * Nature)`.
  - Max+: `SP=32`, `Nature=1.1`
  - Max: `SP=32`, `Nature=1.0`
  - Uninvested: `SP=0`, `Nature=1.0`
  - Min-: `SP=0`, `Nature=0.9`
- **Location**: The fetching logic will reside in `src/services/pokemon.ts`.
- **Return Type**: The function will return an array of objects matching the interface defined in the proposal/requirements.

## Risks / Trade-offs

- **[Risk]** Heavy post-processing in JavaScript → **[Mitigation]** The number of legal Pokémon in a regulation is relatively small (hundreds), so a `map` operation is highly performant.
- **[Risk]** Missing format data → **[Mitigation]** Ensure the query uses an inner join to only return Pokémon with verified legality in the specified format.
