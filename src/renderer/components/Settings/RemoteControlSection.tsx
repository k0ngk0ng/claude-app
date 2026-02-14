import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRemoteStore } from '../../stores/remoteStore';
import { useAuthStore } from '../../stores/authStore';
import { SettingsToggle } from './controls/SettingsToggle';
import { QRCodeDisplay } from '../Remote/QRCodeDisplay';

export function RemoteControlSection() {
  const { settings, updateSecurity } = useSettingsStore();
  const { security } = settings;
  const { relayConnected, connect, disconnect } = useRemoteStore();
  const { token } = useAuthStore();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [relayStatus, setRelayStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handlePasswordChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    updateSecurity({ lockPassword: cleaned });
    if (cleaned.length === 6) {
      window.api.remote.updateSettings({ lockPassword: cleaned }).catch(() => {});
    }
  };

  const handleRelayConnect = async () => {
    if (!token) {
      setRelayStatus({ ok: false, message: 'Sign in to your account first.' });
      return;
    }
    setIsConnecting(true);
    setRelayStatus(null);
    try {
      const success = await connect();
      if (success) {
        setRelayStatus({ ok: true, message: 'WebSocket relay connected.' });
      } else {
        setRelayStatus({ ok: false, message: 'Failed to connect. Check server URL and login status.' });
      }
    } catch (err: any) {
      setRelayStatus({ ok: false, message: err.message || 'Connection error.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRelayDisconnect = async () => {
    await disconnect();
    setRelayStatus({ ok: true, message: 'Disconnected.' });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Remote Control</h2>
      <p className="text-sm text-text-muted mb-6">
        Connect your mobile device to control this desktop remotely.
      </p>

      <div className="space-y-6">
        {/* Remote control toggle — master switch */}
        <SettingsToggle
          label="Allow remote control"
          description="Allow paired mobile devices to control this desktop remotely."
          checked={security.allowRemoteControl}
          onChange={(v) => {
            updateSecurity({ allowRemoteControl: v });
            window.api.remote.updateSettings({ allowRemoteControl: v }).catch(() => {});
          }}
        />

        {security.allowRemoteControl && (
          <>
            <div className="border-t border-border" />

            {/* Relay connection */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-1">Relay Connection</h3>
              <p className="text-xs text-text-muted mb-3">
                Connect to the relay server via WebSocket to enable mobile pairing.
              </p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      relayConnected ? 'bg-success' : 'bg-text-muted'
                    }`}
                  />
                  <span className="text-sm text-text-secondary">
                    {relayConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {relayConnected ? (
                  <button
                    onClick={handleRelayDisconnect}
                    className="px-3 py-1.5 text-xs text-text-secondary
                               border border-border rounded-lg
                               hover:text-text-primary hover:bg-surface-hover
                               transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleRelayConnect}
                    disabled={isConnecting}
                    className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg
                               hover:bg-accent/90 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? 'Connecting…' : 'Connect'}
                  </button>
                )}
              </div>

              {relayStatus && (
                <p className={`mt-2 text-xs ${relayStatus.ok ? 'text-success' : 'text-error'}`}>
                  {relayStatus.message}
                </p>
              )}
            </div>

            {/* QR Code pairing — only when relay is connected */}
            {relayConnected && (
              <>
                <div className="border-t border-border" />
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">Mobile Pairing</h3>
                  <p className="text-xs text-text-muted mb-3">
                    Scan the QR code with the Claude Studio mobile app to pair.
                    You only need to scan once — the pairing persists across sessions.
                  </p>
                  <QRCodeDisplay />
                </div>
              </>
            )}

            <div className="border-t border-border" />

            {/* Lock password */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">Lock Password</label>
              <p className="text-xs text-text-muted mb-2">
                6-digit password to unlock desktop when remotely controlled.
              </p>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    value={security.lockPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-36 px-3 py-2 pr-9 bg-bg border border-border rounded-lg
                               text-sm text-text-primary font-mono tracking-widest
                               outline-none focus:border-accent/50 transition-colors"
                    placeholder="666666"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted
                               hover:text-text-primary transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {passwordVisible ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
                {security.lockPassword.length < 6 && (
                  <span className="text-xs text-warning">Must be 6 digits</span>
                )}
              </div>
            </div>

            {/* Auto-lock timeout */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">
                Auto-lock delay
              </label>
              <p className="text-xs text-text-muted mb-2">
                Delay before locking desktop after a mobile device takes control. 0 = immediate.
              </p>
              <select
                value={security.autoLockTimeout}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateSecurity({ autoLockTimeout: val });
                  window.api.remote.updateSettings({ autoLockTimeout: val }).catch(() => {});
                }}
                className="px-3 py-2 bg-bg border border-border rounded-lg
                           text-sm text-text-primary outline-none
                           focus:border-accent/50 transition-colors"
              >
                <option value={0}>Immediate</option>
                <option value={3000}>3 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
