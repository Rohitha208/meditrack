import { useState } from "react";


export interface MessageEventHandler {
    (event: MessageEvent): void;
}

export function useWorker(messageEventHandler: MessageEventHandler): Worker | null {
    // Create new worker once and never again
    const [worker] = useState(() => createWorker(messageEventHandler));
    return worker;
}

function createWorker(messageEventHandler: MessageEventHandler): Worker | null {
    if (typeof window !== 'undefined') {
        try {
            const worker = new Worker(new URL("../worker.js", import.meta.url), {
                type: "module",
            });

            // Listen for messages from the Web Worker
            worker.addEventListener("message", messageEventHandler);

            // Listen for errors
            worker.addEventListener("error", (error) => {
                console.error("Worker error:", error);
            });

            return worker;
        } catch (error) {
            console.error("Failed to create worker:", error);
            return null;
        }
    }
    return null;
}
