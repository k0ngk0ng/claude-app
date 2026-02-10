import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { SettingsToggle } from './controls/SettingsToggle';
import { SettingsSelect } from './controls/SettingsSelect';
import { SettingsTagInput } from './controls/SettingsTagInput';

export function PermissionsSection() {
  const { settings, updateGeneral, updatePermissions } = useSettingsStore();
  const { general, permissions } = settings;

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Permissions</h2>
      <p className="text-sm text-text-muted mb-6">
        Control what Claude is allowed to do on your system.
      </p>

      <div className="space-y-6">
        {/* Permission mode */}
        <SettingsSelect
          label="Permission mode"
          description="Control how Claude handles tool permissions. This sets the default for new sessions."
          value={general.autoApprove}
          onChange={(v) => updateGeneral({ autoApprove: v as any })}
          options={[
            { value: 'acceptEdits', label: 'Accept edits — Auto-approve file edits' },
            { value: 'bypassPermissions', label: 'Bypass permissions — Skip all prompts (⚠️ unsafe)' },
            { value: 'plan', label: 'Plan mode — Analyze only, no modifications' },
            { value: 'dontAsk', label: "Don't ask — Auto-deny unless pre-approved" },
          ]}
        />

        {/* Divider */}
        <div className="border-t border-border pt-2" />

        {/* File read */}
        <SettingsToggle
          label="Allow file reading"
          description="Allow Claude to read files from your project directory."
          checked={permissions.allowFileRead}
          onChange={(v) => updatePermissions({ allowFileRead: v })}
        />

        {/* File write */}
        <SettingsToggle
          label="Allow file writing"
          description="Allow Claude to create and modify files in your project."
          checked={permissions.allowFileWrite}
          onChange={(v) => updatePermissions({ allowFileWrite: v })}
        />

        {/* Bash */}
        <SettingsToggle
          label="Allow bash commands"
          description="Allow Claude to execute shell commands. Disable for a read-only experience."
          checked={permissions.allowBash}
          onChange={(v) => updatePermissions({ allowBash: v })}
        />

        {/* MCP */}
        <SettingsToggle
          label="Allow MCP tool use"
          description="Allow Claude to use tools provided by MCP servers."
          checked={permissions.allowMcp}
          onChange={(v) => updatePermissions({ allowMcp: v })}
        />

        {/* Disallowed commands */}
        <SettingsTagInput
          label="Disallowed commands"
          description="Commands that Claude should never execute, even in full-auto mode."
          tags={permissions.disallowedCommands}
          onChange={(tags) => updatePermissions({ disallowedCommands: tags })}
          placeholder="Add a command..."
        />
      </div>
    </div>
  );
}
