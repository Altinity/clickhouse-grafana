import { IconButton } from '@grafana/ui';
import React, { useState } from 'react';

export const FormattedSQL = ({ sql, showFormattedSQL }: { sql: any; showFormattedSQL: boolean }) => {
  const [copyMessage, setCopyMessage] = useState('');
  const [isFading, setIsFading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopyMessage('Copied!');
      setIsFading(false); // Ensure message is fully visible before fading starts
      setTimeout(() => setIsFading(true), 500); // Start fading after 1 second
      setTimeout(() => setCopyMessage(''), 1500); // Remove message after 2 seconds
    });
  };

  return showFormattedSQL ? (
    <div style={{ width: '100%' }}>
      <h4 style={{ marginBottom: '10px' }}>Reformatted Query</h4>
      <div style={{ position: 'relative' }}>
        <pre
          style={{
            position: 'relative',
            // padding: '10px',
          }}
        >
          {sql}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {copyMessage && (
              <span
                style={{
                  margin: 0,
                  color: 'rgb(108, 207, 142)',
                  opacity: isFading ? 0 : 1,
                  transition: 'opacity 1s ease',
                }}
              >
                {copyMessage}
              </span>
            )}
            <IconButton
              aria-label="copy-formatted-data-to-clipboard"
              name="copy"
              size="lg"
              variant="primary"
              onClick={handleCopy}
              disabled={!!copyMessage}
            />
          </div>
        </pre>
      </div>
    </div>
  ) : null;
};
