import React, { useEffect, useState, useCallback } from 'react';
import type { SkillInfo } from '../../types';

type EditingSkill = {
  name: string;
  type: 'md' | 'sh';
  content: string;
  description: string;
  argumentHint: string;
};

const emptySkill: EditingSkill = {
  name: '',
  type: 'md',
  content: '',
  description: '',
  argumentHint: '',
};

function buildContent(skill: EditingSkill): string {
  if (skill.type === 'md') {
    const hasFrontmatter = skill.description || skill.argumentHint;
    if (hasFrontmatter) {
      let fm = '---\n';
      if (skill.description) fm += `description: ${skill.description}\n`;
      if (skill.argumentHint) fm += `argument-hint: ${skill.argumentHint}\n`;
      fm += '---\n\n';
      return fm + skill.content;
    }
    return skill.content;
  }
  if (!skill.content.startsWith('#!')) {
    return '#!/bin/bash\n' + skill.content;
  }
  return skill.content;
}

function parseContentForEditing(skill: SkillInfo): EditingSkill {
  let content = skill.content;

  // Strip frontmatter from content for editing
  if (skill.type === 'md' && content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      content = content.substring(endIdx + 3).replace(/^\n+/, '');
    }
  }

  return {
    name: skill.name,
    type: skill.type,
    content,
    description: skill.description,
    argumentHint: skill.argumentHint,
  };
}

export function SkillsSection() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState<EditingSkill>({ ...emptySkill });
  const [editSkill, setEditSkill] = useState<EditingSkill>({ ...emptySkill });

  const loadSkills = useCallback(async () => {
    try {
      const list = await window.api.skills.list();
      setSkills(list);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleAdd = async () => {
    if (!newSkill.name) return;
    const fileName = `${newSkill.name}.${newSkill.type}`;
    const content = buildContent(newSkill);
    const ok = await window.api.skills.create('global', fileName, content);
    if (ok) {
      setNewSkill({ ...emptySkill });
      setIsAdding(false);
      loadSkills();
    }
  };

  const handleUpdate = async (originalPath: string) => {
    const content = buildContent(editSkill);
    const ok = await window.api.skills.update(originalPath, content);
    if (ok) {
      setEditingPath(null);
      loadSkills();
    }
  };

  const handleRemove = async (skill: SkillInfo) => {
    const ok = await window.api.skills.remove(skill.filePath);
    if (ok) {
      loadSkills();
    }
  };

  const startEditing = (skill: SkillInfo) => {
    setEditingPath(skill.filePath);
    setEditSkill(parseContentForEditing(skill));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Skills</h2>
      <p className="text-sm text-text-muted mb-6">
        Manage slash commands for Claude Code.
        Stored in <code className="text-xs bg-surface px-1 py-0.5 rounded">~/.claude/commands/</code>
      </p>

      {/* Skill list */}
      <div className="space-y-2 mb-6">
        {skills.length === 0 && !isAdding && (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="mx-auto mb-3 text-text-muted">
              <path d="M4 2.5l8 5.5-8 5.5V2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-text-muted">No skills configured</p>
            <p className="text-xs text-text-muted mt-1">
              Add a skill to create a reusable slash command
            </p>
          </div>
        )}

        {skills.map((skill) => (
          <div key={skill.filePath} className="border border-border rounded-lg p-4 bg-surface">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  skill.type === 'md'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-warning/10 text-warning'
                }`}>
                  .{skill.type}
                </span>
                <span className="text-sm font-medium text-text-primary">/{skill.name}</span>
                {skill.argumentHint && (
                  <span className="text-xs text-text-muted">{skill.argumentHint}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => window.api.app.showItemInFolder(skill.filePath)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary
                             hover:bg-surface-hover transition-colors"
                  title="Reveal in Finder"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4l2-2h4l1 1h5a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
                <button
                  onClick={() => startEditing(skill)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary
                             hover:bg-surface-hover transition-colors"
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRemove(skill)}
                  className="p-1.5 rounded text-text-muted hover:text-error
                             hover:bg-surface-hover transition-colors"
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {editingPath !== skill.filePath && skill.description && (
              <p className="text-xs text-text-muted mt-1 line-clamp-2">{skill.description}</p>
            )}

            {/* Inline edit */}
            {editingPath === skill.filePath && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {editSkill.type === 'md' && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">Description</label>
                      <input
                        type="text"
                        value={editSkill.description}
                        onChange={(e) => setEditSkill({ ...editSkill, description: e.target.value })}
                        className="w-full px-3 py-1.5 bg-bg border border-border rounded text-sm
                                   text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="w-48">
                      <label className="text-xs text-text-muted mb-1 block">Argument hint</label>
                      <input
                        type="text"
                        value={editSkill.argumentHint}
                        onChange={(e) => setEditSkill({ ...editSkill, argumentHint: e.target.value })}
                        className="w-full px-3 py-1.5 bg-bg border border-border rounded text-sm
                                   text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Content</label>
                  <textarea
                    value={editSkill.content}
                    onChange={(e) => setEditSkill({ ...editSkill, content: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-sm
                               text-text-primary font-mono focus:outline-none focus:border-accent resize-none
                               leading-relaxed"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(skill.filePath)}
                    className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm
                               rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPath(null)}
                    className="px-4 py-1.5 bg-surface-hover hover:bg-surface-active text-text-secondary
                               text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new skill */}
      {isAdding ? (
        <div className="border border-border rounded-lg p-4 bg-surface space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Add Skill</h3>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Name</label>
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="e.g., my-skill"
                className="w-full px-3 py-1.5 bg-bg border border-border rounded text-sm
                           text-text-primary focus:outline-none focus:border-accent"
              />
              <div className="text-xs text-text-muted mt-0.5">
                Usage: <code className="bg-surface px-1 rounded">/{newSkill.name || 'name'}</code>
              </div>
            </div>
            <div className="w-32">
              <label className="text-xs text-text-muted mb-1 block">Type</label>
              <select
                value={newSkill.type}
                onChange={(e) => setNewSkill({ ...newSkill, type: e.target.value as 'md' | 'sh' })}
                className="w-full px-3 py-1.5 bg-bg border border-border rounded text-sm
                           text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="md">Prompt (.md)</option>
                <option value="sh">Script (.sh)</option>
              </select>
            </div>
          </div>

          {newSkill.type === 'md' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">Description</label>
                <input
                  type="text"
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  placeholder="Brief description of what this skill does"
                  className="w-full px-3 py-1.5 bg-bg border border-border rounded text-sm
                             text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div className="w-48">
                <label className="text-xs text-text-muted mb-1 block">Argument hint</label>
                <input
                  type="text"
                  value={newSkill.argumentHint}
                  onChange={(e) => setNewSkill({ ...newSkill, argumentHint: e.target.value })}
                  placeholder="e.g., [task description]"
                  className="w-full px-3 py-1.5 bg-bg border border-border rounded text-sm
                             text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-text-muted mb-1 block">Content</label>
            <textarea
              value={newSkill.content}
              onChange={(e) => setNewSkill({ ...newSkill, content: e.target.value })}
              placeholder={newSkill.type === 'md'
                ? 'Enter the prompt template...\n\nUse $ARGUMENTS to reference user input.'
                : '# Your script here\n# Arguments are passed as $1, $2, etc.'}
              rows={8}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-sm
                         text-text-primary font-mono focus:outline-none focus:border-accent resize-none
                         leading-relaxed"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!newSkill.name || !newSkill.content}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm
                         rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Skill
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSkill({ ...emptySkill });
              }}
              className="px-4 py-1.5 bg-surface-hover hover:bg-surface-active text-text-secondary
                         text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-border
                     rounded-lg text-sm text-text-secondary hover:text-text-primary
                     hover:border-text-muted transition-colors w-full justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add Skill
        </button>
      )}
    </div>
  );
}
