import { useEffect, useRef } from 'react';

/**
 * Register IPC event listeners once on mount, with stable callback references.
 * Uses refs to avoid stale closures while keeping the effect deps clean.
 *
 * 挂载时注册 IPC 事件监听器，使用 ref 避免闭包陈旧且 effect 依赖干净。
 * 监听器只注册一次——回调通过 ref 获取最新引用，无需重新注册。
 */
export function useIpcListeners(
  appendToken: (token: string) => void,
  finishStreaming: (convId: string) => void,
  setStreamError: (err: string) => void,
  handleSummaryResult: (data: { summary: string; error?: string }) => void,
) {
  // Keep latest callbacks in refs so the one-time effect always calls the current version.
  // 将最新回调存入 ref，确保一次性注册的 effect 始终调用最新版本。
  const refs = useRef({ appendToken, finishStreaming, setStreamError, handleSummaryResult });

  useEffect(() => {
    // Update refs inside effect so ESLint sees no render-phase ref mutation
    refs.current = { appendToken, finishStreaming, setStreamError, handleSummaryResult };
    const u1 = window.electronAPI.onChatToken((d) => refs.current.appendToken(d.token));
    const u2 = window.electronAPI.onChatDone((d) => refs.current.finishStreaming(d.conversationId));
    const u3 = window.electronAPI.onChatError((d) => refs.current.setStreamError(d.error));
    const u4 = window.electronAPI.onChatSummaryResult((d) => refs.current.handleSummaryResult(d));
    return () => { u1(); u2(); u3(); u4(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
