import React, { useEffect, useState } from 'react';
import type { User } from '../../types';
import { apiClient } from '../../api/client';
import { GlassCard } from '../../components/GlassCard';
import { UserPlus, Trash2 } from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'hq_admin' | 'warehouse_head'>('warehouse_head');
  const [warehouseScope, setWarehouseScope] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<User[]>('/api/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await apiClient.post('/api/admin/users', {
        name,
        email,
        password,
        role,
        warehouse_scope: role === 'warehouse_head' ? warehouseScope : null,
      });

      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;
    try {
      await apiClient.delete(`/api/admin/users/${encodeURIComponent(userEmail)}`);
      setUsers(users.filter((u) => u.email !== userEmail));
    } catch (e) {
      console.error("Failed to delete user", e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-strong tracking-tight">Warehouse Heads & Governance</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          HQ Admin provisioning for warehouse head accounts & role permissions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <GlassCard>
            <h3 className="font-bold text-sm text-strong mb-4 flex items-center gap-2">
              <UserPlus size={16} className="text-cyan-500" />
              <span>Provision User Account</span>
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-semibold text-strong outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@tnwarehouses.gov.in"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-semibold text-strong outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-semibold text-strong outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-500 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-semibold text-strong outline-none"
                  >
                    <option value="warehouse_head">Warehouse Head</option>
                    <option value="hq_admin">HQ Admin</option>
                  </select>
                </div>

                {role === 'warehouse_head' && (
                  <div>
                    <label className="block font-medium text-gray-500 mb-1">Warehouse Scope</label>
                    <select
                      value={warehouseScope}
                      onChange={(e) => setWarehouseScope(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-semibold text-strong outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => (
                        <option key={id} value={id}>Warehouse #{id}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                Create Account
              </button>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-7">
          <GlassCard>
            <h3 className="font-bold text-sm text-strong mb-4">Provisioned System Users</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-500/10 text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Scope</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-500/10">
                  {users.map((u) => (
                    <tr key={u.email} className="hover:bg-gray-500/5">
                      <td className="py-3">
                        <span className="font-bold text-strong block">{u.name}</span>
                        <span className="text-[11px] text-gray-500">{u.email}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'hq_admin'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                            : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {u.role === 'hq_admin' ? 'HQ Admin' : 'Warehouse Head'}
                        </span>
                      </td>
                      <td className="py-3 font-medium">
                        {u.role === 'hq_admin' ? 'All Tamil Nadu' : `Warehouse #${u.warehouse_scope}`}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.email)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
