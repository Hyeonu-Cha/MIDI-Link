import React, { useState } from 'react';
import { Profile } from '../types';
import { profileApi } from '../services/api';

interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileChange: (profileId: string) => void;
  onProfileDeleted?: () => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  activeProfile,
  onProfileChange,
  onProfileDeleted,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      const profileId = await profileApi.createProfile(
        newProfileName.trim(),
        newProfileDescription.trim() || undefined
      );
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

  const mappingCount = activeProfile ? Object.keys(activeProfile.mappings).length : 0;

  return (
    <div className="profile-selector">
      <div className="row">
        <select
          value={activeProfile?.id ?? ''}
          onChange={(e) => e.target.value && onProfileChange(e.target.value)}
        >
          <option value="">No profile</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          className="iconbtn"
          onClick={() => setShowCreateForm(true)}
          title="Create profile"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <button
          className="iconbtn danger"
          onClick={() => activeProfile && setShowDeleteConfirm(true)}
          disabled={!activeProfile}
          title="Delete profile"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
      {activeProfile && (
        <p className="meta">{mappingCount} mapping{mappingCount !== 1 ? 's' : ''}</p>
      )}

      {/* ── Create profile modal ─────────────────────────────── */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Profiles</span>
                <h3>Create New Profile</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateProfile}>
                <div className="form-group">
                  <label htmlFor="profile-name">Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Live Performance"
                    autoFocus
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-desc">Description (optional)</label>
                  <textarea
                    id="profile-desc"
                    value={newProfileDescription}
                    onChange={(e) => setNewProfileDescription(e.target.value)}
                    placeholder="What is this profile for?"
                    rows={2}
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="create-btn">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ─────────────────────────────── */}
      {showDeleteConfirm && activeProfile && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Destructive Action</span>
                <h3>Delete Profile</h3>
              </div>
              <button
                className="close-btn"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
              >×</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                Delete <strong>"{activeProfile.name}"</strong>? This will remove all{' '}
                {mappingCount} mapping{mappingCount !== 1 ? 's' : ''} and cannot be undone.
              </p>
              {deleteError && <div className="error-message">{deleteError}</div>}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                >
                  Cancel
                </button>
                <button type="button" className="delete-btn" onClick={handleDeleteProfile}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;
