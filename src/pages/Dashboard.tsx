import React, { useState, useEffect } from 'react';
import { BarChart2, LogOut, PlusCircle, List, Settings, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { yeshteryApi } from '@/lib/utils';

const sidebarItems = [
  { key: 'create-tier', icon: <PlusCircle className="h-6 w-6" />, label: 'Create Tier' },
  { key: 'manage-tiers', icon: <List className="h-6 w-6" />, label: 'Manage Tiers' },
  { key: 'create-tier-config', icon: <Settings className="h-6 w-6" />, label: 'Create Tier Config' },
  { key: 'manage-tier-configs', icon: <Layers className="h-6 w-6" />, label: 'Manage Tier Configs' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('create-tier');
  const { toast } = useToast ? useToast() : { toast: () => {} };
  const { user, logout } = useAuth();
  const [tierForm, setTierForm] = useState({
    tierName: '',
    isActive: true,
    isSpecial: false,
    noOfPurchaseFrom: '',
    noOfPurchaseTo: '',
    cashBackPercentage: '',
  });
  const [editingTierId, setEditingTierId] = useState(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [tiersError, setTiersError] = useState('');

  // Create Config form state
  const [configForm, setConfigForm] = useState({
    description: '',
    defaultTierId: '',
    requiredPoints: '',
    cashbackReward: '',
    referralAmount: '50',
    reviewAmount: '50',
  });
  const [configLoading, setConfigLoading] = useState(false);

  // Manage Tier Configs state
  const [configs, setConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configsError, setConfigsError] = useState('');

  useEffect(() => {
    if (activeSection !== 'manage-tiers') return;
    const fetchTiers = async () => {
      setTiersLoading(true);
      setTiersError('');
      try {
        if (!user?.token) throw new Error('Not authenticated');
        const res = await api.get(
          yeshteryApi + 'loyalty/tier/list',
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setTiers(res.data);
      } catch (err) {
        setTiersError(err?.response?.data?.message || err.message || 'Failed to fetch tiers');
      } finally {
        setTiersLoading(false);
      }
    };
    fetchTiers();
  }, [activeSection, user]);

  useEffect(() => {
    if (activeSection !== 'manage-tier-configs') return;
    const fetchConfigs = async () => {
      setConfigsLoading(true);
      setConfigsError('');
      try {
        if (!user?.token) throw new Error('Not authenticated');
        const res = await api.get(
          yeshteryApi + 'loyalty/config/list',
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setConfigs(res.data);
      } catch (err) {
        setConfigsError(err?.response?.data?.message || err.message || 'Failed to fetch configs');
      } finally {
        setConfigsLoading(false);
      }
    };
    fetchConfigs();
  }, [activeSection, user]);

  const handleTierChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && (name === 'isActive' || name === 'isSpecial')) {
      setTierForm(f => ({
        ...f,
        isActive: name === 'isActive' ? checked : false,
        isSpecial: name === 'isSpecial' ? checked : false,
      }));
    } else {
      setTierForm(f => ({
        ...f,
        [name]: value
      }));
    }
  };

  const handleCreateTier = async (e) => {
    e.preventDefault();
    if (Number(tierForm.cashBackPercentage) >= 100) {
      toast({
        title: 'Invalid Cashback',
        description: 'Cashback percentage must be below 100.',
        variant: 'destructive',
      });
      return;
    }
    setTierLoading(true);
    try {
      const cashBackDecimal = Number(tierForm.cashBackPercentage) / 100;
      const body = {
        tier_name: tierForm.tierName || '',
        is_active: tierForm.isActive,
        is_special: tierForm.isSpecial,
        no_of_purchase_from: tierForm.noOfPurchaseFrom ? Number(tierForm.noOfPurchaseFrom) : 0,
        no_of_purchase_to: tierForm.noOfPurchaseTo ? Number(tierForm.noOfPurchaseTo) : 0,
        operation: editingTierId ? 'update' : 'create',
        constraints: {
          ORDER_ONLINE: cashBackDecimal,
          REFERRAL: 1,
          REVIEW_PRODUCT: 1,
        },
        ...(editingTierId ? { tier_id: editingTierId } : {}),
      };
      console.log('Create/Update Tier request body:', body);
      if (!user?.token) {
        toast({
          title: 'Not authenticated',
          description: 'No user token found.',
          variant: 'destructive',
        });
        return;
      }
      await api.post(
        yeshteryApi + 'loyalty/tier/update',
        body,
        { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json', 'X-Skip-401-Interceptor': true } }
      );
      toast({
        title: editingTierId ? 'Tier updated!' : 'Tier created!',
        description: editingTierId ? 'The tier was updated successfully.' : 'The tier was created successfully.',
      });
      setTierForm({
        tierName: '',
        isActive: true,
        isSpecial: false,
        noOfPurchaseFrom: '',
        noOfPurchaseTo: '',
        cashBackPercentage: '',
      });
      setEditingTierId(null);
      // Refresh the list if on manage-tiers
      if (activeSection === 'manage-tiers') {
        setTiersLoading(true);
        try {
          const res = await api.get(
            yeshteryApi + 'loyalty/tier/list',
            { headers: { Authorization: `Bearer ${user.token}` } }
          );
          setTiers(res.data);
        } catch {}
        setTiersLoading(false);
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        toast({
          title: 'Unauthorized',
          description: 'You are not authorized to perform this action.',
          variant: 'destructive',
        });
        setTierLoading(false);
        return;
      }
      const message = error?.response?.data?.message || 'Failed to create/update tier.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setTierLoading(false);
    }
  };

  const handleEditTier = (tier) => {
    setActiveSection('create-tier');
    setEditingTierId(tier.id || tier.tier_id);
    setTierForm({
      tierName: tier.tier_name || '',
      isActive: !!tier.is_active,
      isSpecial: !!tier.is_special,
      noOfPurchaseFrom: tier.no_of_purchase_from?.toString() || '',
      noOfPurchaseTo: tier.no_of_purchase_to?.toString() || '',
      cashBackPercentage: tier.constraints?.ORDER_ONLINE ? (Number(tier.constraints.ORDER_ONLINE) * 100).toString() : '',
    });
  };

  const handleDeleteTier = async (tierId) => {
    if (!window.confirm('Are you sure you want to delete this tier?')) return;
    try {
      if (!user?.token) throw new Error('Not authenticated');
      await api.delete(
        yeshteryApi + `loyalty/tier/delete?tier_id=${tierId}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setTiers(prev => prev.filter(tier => tier.tier_id !== tierId));
      toast({ title: 'Tier deleted', description: 'The tier was deleted successfully.' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.response?.data?.message || err.message || 'Failed to delete tier',
        variant: 'destructive',
      });
    }
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfigForm(f => ({ ...f, [name]: value }));
  };

  const handleCreateConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      const body = {
        description: configForm.description,
        default_tier: { id: Number(configForm.defaultTierId) },
        operation: 'create',
        constraints: {
          ORDER_ONLINE: {
            ratio_from: configForm.requiredPoints,
            ratio_to: configForm.cashbackReward,
          },
          REFERRAL: {
            ratio_from: '1',
            ratio_to: '1',
            amount: configForm.referralAmount,
          },
          REVIEW_PRODUCT: {
            ratio_from: '1',
            ratio_to: '1',
            amount: configForm.reviewAmount,
          },
        },
      };
      if (!user?.token) {
        toast({ title: 'Not authenticated', description: 'No user token found.', variant: 'destructive' });
        setConfigLoading(false);
        return;
      }
      await api.post(
        yeshteryApi + 'loyalty/config/update',
        body,
        { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' } }
      );
      toast({ title: 'Config created!', description: 'The configuration was created successfully.' });
      setConfigForm({
        description: '',
        defaultTierId: '',
        requiredPoints: '',
        cashbackReward: '',
        referralAmount: '50',
        reviewAmount: '50',
      });
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to create configuration.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleEditConfig = (config) => {
    setActiveSection('create-tier-config');
    setConfigForm({
      description: config.description || '',
      defaultTierId: config.default_tier?.id?.toString() || '',
      requiredPoints: config.constraints?.ORDER_ONLINE?.ratio_from || '',
      cashbackReward: config.constraints?.ORDER_ONLINE?.ratio_to || '',
      referralAmount: config.constraints?.REFERRAL?.amount || '50',
      reviewAmount: config.constraints?.REVIEW_PRODUCT?.amount || '50',
    });
  };

  const handleDeleteConfig = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) return;
    try {
      await api.delete(
        yeshteryApi + `loyalty/config/delete?id=${configId}`
      );
      setConfigs(prev => prev.filter(config => config.id !== configId));
      toast({ title: 'Config deleted', description: 'The configuration was deleted successfully.' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.response?.data?.message || err.message || 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-700 via-blue-500 to-blue-300">
      {/* Sidebar */}
      <aside className="w-20 md:w-28 bg-white/90 shadow-2xl flex flex-col items-center py-8 gap-6">
        <BarChart2 className="h-8 w-8 text-blue-600 mb-8" />
        {sidebarItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-150 hover:bg-blue-100/80 focus:outline-none ${activeSection === item.key ? 'bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg' : 'text-blue-700'}`}
            title={item.label}
          >
            {item.icon}
            <span className="text-xs font-semibold mt-1">{item.label}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="mt-auto flex flex-col items-center gap-1 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold shadow hover:from-blue-700 hover:to-blue-500 transition"
        >
          <LogOut className="h-5 w-5 mb-1" />
          <span className="text-xs">Logout</span>
        </button>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-white/90 rounded-2xl shadow-2xl p-10 max-w-2xl w-full flex flex-col items-center min-h-[300px]">
          {activeSection === 'create-tier' && (
            <>
              <h1 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><PlusCircle className="h-6 w-6" /> Create Tier</h1>
              <form className="w-full max-w-lg space-y-4" onSubmit={handleCreateTier}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Tier Name</label>
                    <input name="tierName" value={tierForm.tierName} onChange={handleTierChange} className="w-full rounded border px-3 py-2" required />
                  </div>
                  <div className="flex items-center gap-6 mt-6 md:mt-0">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isActive" checked={tierForm.isActive} onChange={handleTierChange} />
                      Active
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isSpecial" checked={tierForm.isSpecial} onChange={handleTierChange} />
                      Special
                    </label>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Minimum Order Number</label>
                    <input name="noOfPurchaseFrom" type="number" value={tierForm.noOfPurchaseFrom} onChange={handleTierChange} className="w-full rounded border px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Maximum Order Number</label>
                    <input name="noOfPurchaseTo" type="number" value={tierForm.noOfPurchaseTo} onChange={handleTierChange} className="w-full rounded border px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Order Online Cashback Percentage </label>
                    <input name="cashBackPercentage" type="number" value={tierForm.cashBackPercentage} onChange={handleTierChange} className="w-full rounded border px-3 py-2" required max={99.99} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={tierLoading} className="px-6 py-2 rounded bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold shadow hover:from-blue-700 hover:to-blue-500 transition">
                    {tierLoading ? (editingTierId ? 'Updating...' : 'Creating...') : (editingTierId ? 'Update Tier' : 'Create Tier')}
                  </button>
                </div>
              </form>
            </>
          )}
          {activeSection === 'manage-tiers' && (
            <>
              <h1 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><List className="h-6 w-6" /> Manage Tiers</h1>
              {tiersLoading ? (
                <div className="text-blue-700">Loading tiers...</div>
              ) : tiersError ? (
                <div className="text-red-600">{tiersError}</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full border bg-white rounded shadow">
                    <thead>
                      <tr className="bg-blue-100 text-blue-900">
                        <th className="px-3 py-2 text-left">Tier Name</th>
                        <th className="px-3 py-2">Active</th>
                        <th className="px-3 py-2">Special</th>
                        <th className="px-3 py-2">Min Order</th>
                        <th className="px-3 py-2">Max Order</th>
                        <th className="px-3 py-2">Order Online %</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((tier, idx) => (
                        <tr key={idx} className="border-t hover:bg-blue-50">
                          <td className="px-3 py-2">{tier.tier_name}</td>
                          <td className="px-3 py-2 text-center">{tier.is_active ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2 text-center">{tier.is_special ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2 text-center">{tier.no_of_purchase_from}</td>
                          <td className="px-3 py-2 text-center">{tier.no_of_purchase_to}</td>
                          <td className="px-3 py-2 text-center">{tier.constraints?.ORDER_ONLINE}</td>
                          <td className="px-3 py-2 flex gap-2 justify-center">
                            <button
                              className="px-3 py-1 rounded bg-yellow-400 text-white font-semibold hover:bg-yellow-500 transition"
                              onClick={() => handleEditTier(tier)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                              onClick={() => handleDeleteTier(tier.id || tier.tier_id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {activeSection === 'create-tier-config' && (
            <>
              <h1 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Settings className="h-6 w-6" /> Create Tier Config</h1>
              <form className="w-full max-w-2xl space-y-8 bg-white/90 rounded-xl shadow-lg p-8" onSubmit={handleCreateConfig}>
                <div className="mb-6">
                  <label className="block font-semibold text-lg mb-2">Description</label>
                  <input name="description" value={configForm.description} onChange={handleConfigChange} className="w-full rounded border px-3 py-2 bg-blue-50 focus:bg-white transition" required />
                </div>
                <div className="mb-8">
                  <label className="block font-semibold text-lg mb-2">Default Tier</label>
                  <select name="defaultTierId" value={configForm.defaultTierId} onChange={handleConfigChange} className="w-full rounded border px-3 py-2 bg-blue-50 focus:bg-white transition" required>
                    <option value="">Select a tier</option>
                    {tiers.map(tier => (
                      <option key={tier.id || tier.tier_id} value={tier.id || tier.tier_id}>{tier.tier_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-8 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="font-semibold text-blue-900 mb-1 text-lg">Order Online</div>
                  <div className="text-sm text-blue-700 mb-4">Provide required points and cashback reward amount ratio.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-medium mb-1">Required Points</label>
                      <input name="requiredPoints" value={configForm.requiredPoints} onChange={handleConfigChange} className="w-full rounded border px-3 py-2 bg-white" required />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Cashback Reward Amount Ratio</label>
                      <input name="cashbackReward" value={configForm.cashbackReward} onChange={handleConfigChange} className="w-full rounded border px-3 py-2 bg-white" required />
                    </div>
                  </div>
                </div>
                <div className="mb-8 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="font-semibold text-blue-900 mb-1 text-lg">Referral</div>
                  <div className="text-sm text-blue-700 mb-4">Provide required points amount will customer get when referral his friend and sign up.</div>
                  <div>
                    <label className="block font-medium mb-1">Required Points Amount</label>
                    <input name="referralAmount" value={configForm.referralAmount} onChange={handleConfigChange} className="w-full rounded border px-3 py-2 bg-white" required />
                  </div>
                </div>
                <div className="mb-8 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="font-semibold text-blue-900 mb-1 text-lg">Review Product</div>
                  <div className="text-sm text-blue-700 mb-4">Provide required points amount will customer get when review product.</div>
                  <div>
                    <label className="block font-medium mb-1">Required Points Amount</label>
                    <input name="reviewAmount" value={configForm.reviewAmount} onChange={handleConfigChange} className="w-full rounded border px-3 py-2 bg-white" required />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={configLoading} className="px-6 py-2 rounded bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold shadow hover:from-blue-700 hover:to-blue-500 transition">
                    {configLoading ? 'Creating...' : 'Create Config'}
                  </button>
                </div>
              </form>
            </>
          )}
          {activeSection === 'manage-tier-configs' && (
            <>
              <h1 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Layers className="h-6 w-6" /> Manage Tier Configs</h1>
              {configsLoading ? (
                <div className="text-blue-700">Loading configs...</div>
              ) : configsError ? (
                <div className="text-red-600">{configsError}</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full border bg-white rounded shadow">
                    <thead>
                      <tr className="bg-blue-100 text-blue-900">
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2">Default Tier</th>
                        <th className="px-3 py-2">Order Online</th>
                        <th className="px-3 py-2">Referral</th>
                        <th className="px-3 py-2">Review Product</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map((config, idx) => (
                        <tr key={idx} className="border-t hover:bg-blue-50">
                          <td className="px-3 py-2">{config.description}</td>
                          <td className="px-3 py-2 text-center">{config.default_tier?.id}</td>
                          <td className="px-3 py-2 text-center">
                            Points: {config.constraints?.ORDER_ONLINE?.ratio_from}<br />
                            Cashback: {config.constraints?.ORDER_ONLINE?.ratio_to}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {config.constraints?.REFERRAL?.amount}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {config.constraints?.REVIEW_PRODUCT?.amount}
                          </td>
                          <td className="px-3 py-2 flex gap-2 justify-center">
                            <button
                              className="px-3 py-1 rounded bg-yellow-400 text-white font-semibold hover:bg-yellow-500 transition"
                              onClick={() => handleEditConfig(config)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                              onClick={() => handleDeleteConfig(config.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 