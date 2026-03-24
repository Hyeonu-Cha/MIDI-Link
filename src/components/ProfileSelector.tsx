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
      onProfileDeleted?.(); // Refresh profiles list in parent
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
    <div className="profile-selector">
      <div className="current-profile">
        <select
          value={activeProfile?.id || ''}
          onChange={(e) => e.target.value && onProfileChange(e.target.value)}
          className="profile-dropdown"
        >
          <option value="">Select a profile</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <button
          className="create-profile-btn"
          onClick={() => setShowCreateForm(true)}
          title="Create new profile"
        >
          +
        </button>
      </div>

      {activeProfile && (
        <div className="profile-info">
          <div className="profile-header">
            <div className="profile-name">{activeProfile.name}</div>
            <button
              className="delete-profile-btn"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete profile"
            >
              ×
            </button>
          </div>
          {activeProfile.description && (
            <div className="profile-description">{activeProfile.description}</div>
          )}
          <div className="profile-stats">
            {Object.keys(activeProfile.mappings).length} mappings
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="create-profile-modal">
          <div className="modal-overlay" onClick={() => setShowCreateForm(false)} />
          <div className="modal-content">
            <h3>Create New Profile</h3>
            <form onSubmit={handleCreateProfile}>
              <div className="form-group">
                <label htmlFor="profile-name">Name:</label>
                <input
                  id="profile-name"
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Enter profile name"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="profile-description">Description (optional):</label>
                <textarea
                  id="profile-description"
                  value={newProfileDescription}
                  onChange={(e) => setNewProfileDescription(e.target.value)}
                  placeholder="Enter profile description"
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="create-btn">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="create-profile-modal">
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} />
          <div className="modal-content">
            <h3>Delete Profile</h3>
            <p>Are you sure you want to delete the profile "{activeProfile?.name}"?</p>
            <p>This action cannot be undone and will delete all {Object.keys(activeProfile?.mappings || {}).length} mappings.</p>
            {deleteError && <div className="error-message">{deleteError}</div>}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleDeleteProfile}
                className="delete-btn"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;