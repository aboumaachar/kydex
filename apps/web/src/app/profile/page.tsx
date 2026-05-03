"use client";

import { useEffect, useState } from 'react';
import { apiRequest, getAuthToken, logout } from '../../lib/api';

type UserProfile = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  tenantId?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<UserProfile>('/users/me', {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
      .then((data) => setProfile(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load profile'));
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">User Profile</h1>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-6 grid gap-2 text-sm text-slate-700">
        <p>
          <strong>Name:</strong> {profile?.fullName ?? '...'}
        </p>
        <p>
          <strong>Email:</strong> {profile?.email ?? '...'}
        </p>
        <p>
          <strong>Role:</strong> {profile?.role ?? '...'}
        </p>
        <p>
          <strong>Tenant:</strong> {profile?.tenantId ?? '...'}
        </p>
      </div>
      <button onClick={logout} className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm">
        Logout
      </button>
    </section>
  );
}
