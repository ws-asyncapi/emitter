# @ws-asyncapi/emitter

Emit **ws-asyncapi** events to connected clients from a process that **isn't running a
server** — the [`@socket.io/redis-emitter`](https://socket.io/docs/v4/redis-adapter/#emitter)
equivalent. Perfect for microservices: a background job, billing service, or cron emits an
event and clients connected to your gateway receive it.

## How it works

Hand the emitter a **backplane shared with your running servers** (a `RedisBackplane` pointed
at the same Redis). The emitter publishes through it; each server's backplane delivers to its
connected clients. Typed against your channel via `typeof channel`.

## Installation

```bash
npm install @ws-asyncapi/emitter @ws-asyncapi/backplane-redis ws-asyncapi
```

## Usage

```ts
import { RedisBackplane } from "@ws-asyncapi/backplane-redis";
import { createEmitter } from "@ws-asyncapi/emitter";
import type { chat } from "./contract"; // your Channel's type

const emitter = createEmitter<typeof chat>(
  new RedisBackplane({ url: "redis://localhost:6379" }),
);

// emit to a room — every client in room:1 across the cluster receives it
await emitter.publish("room:1", "message", { from: "billing", text: "payment received" });

// emit to a single socket by id
await emitter.toSocket(socketId, "message", { from: "system", text: "hi" });
```

Event names and payloads are inferred from the channel's `serverMessage` declarations, so a
wrong event name or payload shape is a compile error.

## API

- `createEmitter<typeof channel>(backplane, { codec? })` → `{ publish, toSocket, close }`
- **One-way only**: emit to rooms / sockets. Acknowledgements, presence, and inbound messages
  require a running server (use an adapter for those).
- The `codec` must match your servers' codec; recovery offsets are honored if the backplane
  has recovery enabled (so emitted events are replayable too).

## License

MIT
