import React, { useState } from 'react';
import { Profile } from '../types';
import { profileApi } from '../services/api';

interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileChange: (profileId: string) => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  activeProfile,
  onProfileChange,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');

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
      // Note: Parent component should refresh profiles list
    } catch (error) {
      console.error('Failed to create profile:', error);
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
          <div className="profile-name">{activeProfile.name}</div>
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
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;