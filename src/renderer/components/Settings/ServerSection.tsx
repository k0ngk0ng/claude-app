import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { SettingsInput } from './controls/SettingsInput';

export function ServerSection() {
  const { settings, updateServer } = useSettingsStore();
  const { server } = settings;
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [defaultUrl, setDefaultUrl] = useState('');

  // Load the build-time default once
  useEffect(() => {
    window.api.auth.getDefaultServerUrl().then(setDefaultUrl).catch(() => {});
  }, []);

  const isCustom = !!server.serverUrl && server.serverUrl !== defaultUrl;
  // What the server actually uses: custom > build-time default
  const displayUrl = server.serverUrl || defaultUrl;

  const handleTest = async () => {
    setChecking(true);
    setStatus(null);
    try {
      const url = displayUrl.replace(/\/+$/, '');
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setStatus({ ok: true, message: `Connected — server v${data.version || 'unknown'}` });
      } else {
        setStatus({ ok: false, message: `Server responded with ${res.status}` });
      }
    } catch (err: any) {
      setStatus({ ok: false, message: err.message || 'Cannot reach server' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Server</h2>
      <p className="text-sm text-text-muted mb-6">
        Configure the ClaudeStudio server for authentication and data sync.
      </p>

      <div className="space-y-6">
        <SettingsInput
          label="Server URL"
          description={defaultUrl ? `Default: ${defaultUrl}` : 'Leave empty to use the build-time default.'}
          type="text"
          value={server.serverUrl}
          onChange={(v) => updateServer({ serverUrl: v })}
          placeholder={defaultUrl || 'http://localhost:3456'}
        />

        {/* Only show reset when user has overridden the default */}
        {isCustom && (
          <div className="text-xs text-text-muted -mt-3">
            <button
              onClick={() => updateServer({ serverUrl: '' })}
              className="text-accent hover:underline"
            >
              Reset to default ({defaultUrl})
            </button>
          </div>
        )}

        {/* Test connection */}
        <div>
          <button
            onClick={handleTest}
            disabled={checking || !displayUrl}
            className="px-3 py-1.5 rounded-md bg-accent text-white text-xs font-medium
                       hover:bg-accent/90 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? 'Testing…' : 'Test Connection'}
          </button>
          {status && (
            <p className={`mt-2 text-xs ${status.ok ? 'text-success' : 'text-error'}`}>
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
