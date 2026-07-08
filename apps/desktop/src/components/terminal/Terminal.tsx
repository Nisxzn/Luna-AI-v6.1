import React, { useEffect, useRef } from 'react';
import { useTerminal } from '../../hooks/useTerminal';

interface TerminalProps {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
  onData,
  onResize,
  className = '',
}) => {
  const { terminalRef, fitTerminal, writeln, focus } = useTerminal({
    onData,
    onResize,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      fitTerminal();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [fitTerminal]);

  // Display welcome message
  useEffect(() => {
    const welcomeMessage = [
      '\r\n',
      '\x1b[1;36mLuna AI Terminal\x1b[0m',
      '\r\n',
      '\x1b[90m────────────────────────────────────────\x1b[0m',
      '\r\n',
      'Welcome to Luna AI integrated terminal.',
      '\r\n',
      'This is a frontend-only terminal component.',
      '\r\n',
      'Shell integration will be implemented in Phase 4.5.',
      '\r\n',
      '\x1b[90m────────────────────────────────────────\x1b[0m',
      '\r\n',
      '\x1b[33mPress any key to test keyboard input...\x1b[0m',
      '\r\n',
    ].join('\r\n');

    writeln(welcomeMessage);
  }, [writeln]);

  // Focus terminal on mount
  useEffect(() => {
    // Small delay to ensure terminal is fully initialized
    const timeoutId = setTimeout(() => {
      focus();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [focus]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden ${className}`}
      onClick={focus}
    >
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
};
