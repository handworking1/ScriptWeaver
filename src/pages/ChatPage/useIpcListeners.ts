import { useEffect } from 'react';

export function useIpcListeners(
  appendToken: (token: string) => void,
  finishStreaming: (convId: string) => void,
  setStreamError: (err: string) => void,
  handleSummaryResult: (data: { summary: string; error?: string }) => void,
) {
  useEffect(() => {
    const u1 = window.electronAPI.onChatToken((d) => appendToken(d.token));
    const u2 = window.electronAPI.onChatDone((d) => finishStreaming(d.conversationId));
    const u3 = window.electronAPI.onChatError((d) => setStreamError(d.error));
    const u4 = window.electronAPI.onChatSummaryResult((d) => handleSummaryResult(d));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);
}
