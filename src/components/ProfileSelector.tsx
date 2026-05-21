import { FC, useState } from 'react';
import { Profile } from '../types';
import { profileApi } from '../services/api';

interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileChange: (profileId: string) => void;
  onProfileDeleted?: () => void;
}

const ProfileSelector: FC<ProfileSelectorProps> = ({ profiles, activeProfile, onProfileChange, onProfileDeleted }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      const profileId = await profileApi.createProfile(newProfileName.trim(), newProfileDescription.trim() || undefined);
      onProfileChange(profileId);
      setNewProfileName('');
      setNewProfileDescription('');
      setShowCreateForm(false);
      onProfileDeleted?.();
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    try {
      await profileApi.deleteProfile(activeProfile.id);
      setShowDeleteConfirm(false);
      setDeleteError('');
      onProfileDeleted?.();
    } catch (error) {
      console.error('Failed to delete profile:', error);
      setDeleteError('Failed to delete profile: ' + error);
    }
  };

  return (
    <div data-testid="profile-selector" className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            data-testid="profile-dropdown"
            value={activeProfile?.id || ''}
            onChange={(e) => e.target.value && onProfileChange(e.target.value)}
            className="w-full bg-surface-container text-on-surface text-xs font-bold uppercase tracking-wide rounded-lg px-3 py-2 border border-outline-variant/20 outline-none appearance-none cursor-pointer"
          >
            <option value="">Select a profile</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-on-surface-variant text-sm">expand_more</span>
        </div>
        <button
          data-testid="create-profile-btn"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors"
          onClick={() => setShowCreateForm(true)}
          title="Create new profile"
        >
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
        {activeProfile && (
          <button
            data-testid="delete-profile-btn"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-error hover:border-error/30 transition-colors"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete profile"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        )}
      </div>

      {activeProfile && (
        <div data-testid="profile-info" className="text-[10px] text-on-surface-variant font-mono">
          <span data-testid="profile-name">{activeProfile.name}</span>
          <span className="ml-2 opacity-60">· {Object.keys(activeProfile.mappings).length} mapping{Object.keys(activeProfile.mappings).length !== 1 ? 's' : ''}</span>
          {activeProfile.description && <span data-testid="profile-description" className="ml-2 opacity-60">· {activeProfile.description}</span>}
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateForm && (
        <div data-testid="create-profile-modal-overlay" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div data-testid="create-profile-modal" className="w-full max-w-sm cyber-panel rounded-xl border border-primary/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-primary/10 flex justify-between items-center bg-black/40">
              <h3 className="font-bold text-on-surface">New Profile</h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setShowCreateForm(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary/60">Profile Name</label>
                <input
                  id="profile-name"
                  data-testid="profile-name-input"
                  type="text" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="My Profile" autoFocus required
                  className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary-container text-on-surface text-lg font-headline px-0 py-1 outline-none placeholder:text-on-surface-variant/40"
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary/60">Description (optional)</label>
                <textarea
                  id="profile-description"
                  data-testid="profile-description-input"
                  value={newProfileDescription} onChange={(e) => setNewProfileDescription(e.target.value)}
                  placeholder="What is this profile for?" rows={2}
                  className="w-full bg-transparent border-b border-primary/20 text-on-surface text-sm px-0 py-1 outline-none placeholder:text-on-surface-variant/40 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button data-testid="profile-create-cancel" type="button" onClick={() => setShowCreateForm(false)} className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Cancel</button>
                <button data-testid="profile-create-submit" type="submit" className="glow-button px-6 py-2 rounded-lg bg-gradient-to-r from-primary-container to-surface-tint text-on-primary-container font-bold text-sm hover:scale-105 active:scale-95 transition-all">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div data-testid="profile-delete-modal-overlay" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div data-testid="profile-delete-modal" className="w-full max-w-sm cyber-panel rounded-xl border border-outline-variant/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container">
              <h3 className="font-bold text-on-surface">Delete Profile</h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-on-surface-variant mb-1">Delete profile</p>
              <p className="font-bold text-on-surface mb-2">"{activeProfile?.name}"?</p>
              <p className="text-xs text-on-surface-variant mb-4">
                This will delete all {Object.keys(activeProfile?.mappings || {}).length} mappings and cannot be undone.
              </p>
              {deleteError && <p className="text-xs text-error mb-3">{deleteError}</p>}
              <div className="flex gap-3 justify-end">
                <button data-testid="profile-delete-cancel" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">Cancel</button>
                <button data-testid="profile-delete-confirm" onClick={handleDeleteProfile} className="px-4 py-2 text-sm font-bold bg-error/20 text-error border border-error/30 rounded-lg hover:bg-error/30 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;
