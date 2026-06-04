import {
    type AnyChannel,
    type Backplane,
    type Codec,
    type InferClient,
    jsonCodec,
    perSocketRoom,
    publishEvent,
} from "ws-asyncapi";

export interface EmitterOptions {
    /** wire codec (default: JSON). Must match the servers' codec. */
    codec?: Codec;
}

/**
 * Emit events to connected clients **from a process that isn't running a
 * server** — the Socket.IO `@socket.io/redis-emitter` equivalent. Hand it a
 * backplane shared with the running servers (e.g. a `RedisBackplane` pointed at
 * the same Redis) and publish: the servers' `onMessage` fans your events out to
 * their connected clients. Typed against a channel via `typeof channel`.
 *
 * ```ts
 * import { RedisBackplane } from "@ws-asyncapi/backplane-redis";
 * import { createEmitter } from "@ws-asyncapi/emitter";
 * import type { chat } from "./contract";
 *
 * const emitter = createEmitter<typeof chat>(
 *   new RedisBackplane({ url: "redis://localhost:6379" }),
 * );
 * emitter.publish("room:1", "message", { from: "billing", text: "paid" });
 * ```
 *
 * One-way only: emit to rooms / sockets. Acks, presence, and inbound messages
 * require a running server.
 */
export function createEmitter<C extends AnyChannel>(
    backplane: Backplane,
    options: EmitterOptions = {},
) {
    const codec = options.codec ?? jsonCodec;
    type Events = InferClient<C>["eventMap"];

    return {
        /** Emit an event to everyone in `room`, cluster-wide. */
        publish<E extends keyof Events & string>(
            room: string,
            event: E,
            data: Events[E],
        ): Promise<void> {
            return publishEvent(backplane, codec, room, event, data);
        },
        /** Emit an event to a single socket by id, cluster-wide. */
        toSocket<E extends keyof Events & string>(
            socketId: string,
            event: E,
            data: Events[E],
        ): Promise<void> {
            return publishEvent(
                backplane,
                codec,
                perSocketRoom(socketId),
                event,
                data,
            );
        },
        /** Close the underlying backplane connection. */
        close(): Promise<void> {
            return backplane.close();
        },
    };
}

export type Emitter<C extends AnyChannel> = ReturnType<typeof createEmitter<C>>;
