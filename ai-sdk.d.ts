// These are lightweight type shims for editor/TS only. The runtime is provided by v0's AI SDK.

declare module "ai" {
  // Minimal UI message types used by our app
  export type UITextPart = { type: "text"; text: string };
  export type UIContent = UITextPart[];

  export interface UIMessage {
    id?: string;
    role: "user" | "assistant" | "system";
    // Newer SDKs expose `parts`, older examples use `content`. We support both.
    parts?: UIContent;
    content?: UIContent;
  }

  // Streaming helpers we use in the API route
  export const streamText: (...args: any[]) => {
    toAIStreamResponse?: (...args: any[]) => Response;
    toDataStreamResponse?: (...args: any[]) => Response;
    toTextStreamResponse?: (...args: any[]) => Response;
    toUIMessageStreamResponse: (opts: { consumeSseStream: any }) => Response;
  };

  export const convertToModelMessages: (...args: any[]) => any;
  export const consumeStream: any;

  // Client transport used by our chat window
  export class DefaultChatTransport {
    constructor(options?: any);
  }
}

declare module "@ai-sdk/react" {
  // Very small surface we rely on in ChatWindow
  export function useChat(options?: any): {
    messages: Array<{
      id: string;
      role: "user" | "assistant" | "system";
      parts?: any[];
      content?: any[];
    }>;
    input?: string;
    isLoading: boolean;
    stop: () => void;
    setInput?: (val: string) => void;
    sendMessage: (data: { content: any[] } | string) => Promise<void>;
  };
}
