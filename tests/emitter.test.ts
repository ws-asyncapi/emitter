import { describe, expect, it } from "bun:test";
import { Channel, Frame, jsonCodec, LocalBackplane } from "ws-asyncapi";
import { z } from "zod";
import { createEmitter } from "../src/index.ts";

// The emitter is a thin, type-erased wrapper over the backplane: it encodes an
// Event frame and publishes it to the right topic. We capture what reaches the
// backplane — exactly what a running server's `onMessage` would then fan out.
const chat = new Channel("/room/:id", "room").serverMessage(
	"message",
	z.object({ text: z.string() }),
);

function capture() {
	const backplane = new LocalBackplane();
	const frames: Array<{ topic: string; frame: unknown[] }> = [];
	backplane.onMessage((m) => {
		frames.push({ topic: m.topic, frame: jsonCodec.decode(m.payload) });
	});
	return { backplane, frames };
}

describe("emitter", () => {
	it("publish emits an Event frame to the room topic", async () => {
		const { backplane, frames } = capture();
		const emitter = createEmitter<typeof chat>(backplane);
		await emitter.publish("room:1", "message", { text: "hi" });

		expect(frames).toHaveLength(1);
		expect(frames[0].topic).toBe("room:1");
		expect(frames[0].frame[0]).toBe(Frame.Event);
		expect(frames[0].frame[1]).toBe("message");
		expect(frames[0].frame[2]).toEqual({ text: "hi" });
		await emitter.close();
	});

	it("toSocket targets the reserved per-socket room", async () => {
		const { backplane, frames } = capture();
		const emitter = createEmitter<typeof chat>(backplane);
		await emitter.toSocket("sock-123", "message", { text: "yo" });

		expect(frames[0].topic).toBe("#sid:sock-123");
		expect(frames[0].frame[2]).toEqual({ text: "yo" });
		await emitter.close();
	});

	it("close() closes the backplane", async () => {
		const { backplane } = capture();
		let closed = false;
		const orig = backplane.close.bind(backplane);
		backplane.close = async () => {
			closed = true;
			return orig();
		};
		const emitter = createEmitter<typeof chat>(backplane);
		await emitter.close();
		expect(closed).toBe(true);
	});
});
