# ANPC project

ANPC is a planned Cyberpunk 2077 mod for player-initiated text conversations and context-aware NPC behavior.

## Directory map

- `docs/`: design and product specifications.
- `sources/`: read-only reference material synchronized from the ChatGPT project. Do not edit, rename, move, or delete its files; synchronization may replace them.

## Constraints

- Preserve community NPC characterization and original quest behavior.
- Give crowd NPCs generated personas that remain stable during a conversation.
- Treat game state as authoritative and limit AI actions to verified mod capabilities.
- Use player text input initially; player voice input is out of scope.

## Documentation

- [Initial design](docs/initial-design.md): first playable slice, feasibility checks, and build sequence.
- [Full specification](docs/full-specification.md): complete requirements, NPC policies, architecture, prompt contract, and acceptance criteria.
