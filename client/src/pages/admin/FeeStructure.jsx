import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { CLASSES } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../utils/roleUtils';
import toast from 'react-hot-toast';

const FEE_FIELDS = [
  { key: 'monthly_fee',   label: 'Monthly Fee',   icon: '📅' },
  { key: 'admission_fee', label: 'Admission Fee',  icon: '🎓' },
  { key: 'annual_fee',    label: 'Session Fee',    icon: '📆' },
  { key: 'promotion_fee', label: 'Promotion Fee',  icon: '🔁' },
  { key: 'exam_fee',      label: 'Exam Fee',       icon: '📝' },
];

export default function FeeStructure() {
  const { user }  = useAuth();
  const canEdit   = isSuperAdmin(user);

  const [structures, setStructures] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(null);
  const [formData, setFormData]     = useState({});
  const [saving, setSaving]         = useState(false);

  const load = () => {
    setLoading(true);
    API.get('/fees/structure')
      .then(r => setStructures(r.data || []))
      .catch(() => toast.error('Failed to load fee structure'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (structure) => {
    setEditing(structure);
    const fd = { class: structure.class };
    FEE_FIELDS.forEach(f => { fd[f.key] = parseFloat(structure[f.key] || 0); });
    setFormData(fd);
  };

  const startNew = () => {
    setEditing({ _new: true });
    const fd = { class: CLASSES[0] };
    FEE_FIELDS.forEach(f => { fd[f.key] = 0; });
    setFormData(fd);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.post('/fees/structure', formData);
      toast.success(`Fee structure for ${formData.class} saved!`);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const totalAnnual = (s) =>
    (parseFloat(s.monthly_fee || 0) * 12) +
    parseFloat(s.annual_fee   || 0) +
    parseFloat(s.exam_fee     || 0);

  const f = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Fee Structure</h2>
          <p className="text-gray-400 text-sm mt-0.5">Class-wise fee configuration</p>
        </div>
        {canEdit && (
          <button
            onClick={startNew}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          >
            + Add / Update
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">Loading...</p>
      ) : structures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No fee structures configured yet.</p>
          {canEdit && (
            <button onClick={startNew} className="mt-3 text-blue-500 text-sm font-medium hover:text-blue-700">
              + Add fee structure
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{s.class}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Annual total: {formatCurrency(totalAnnual(s))}</p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => startEdit(s)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {FEE_FIELDS.map(field => (
                  <div key={field.key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{field.icon} {field.label}</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(s[field.key] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {editing._new ? 'Add Fee Structure' : `Edit — ${editing.class}`}
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {editing._new && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
                  <select
                    value={formData.class}
                    onChange={e => setFormData(p => ({ ...p, class: e.target.value }))}
                    className={f}
                  >
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {FEE_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    {field.icon} {field.label} (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData[field.key] ?? 0}
                    onChange={e => setFormData(p => ({ ...p, [field.key]: parseFloat(e.target.value) || 0 }))}
                    className={f}
                  />
                </div>
              ))}

              {/* Annual preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                <p className="text-blue-800 font-medium">Annual Cost Preview</p>
                <p className="text-blue-600 text-xs mt-1">
                  Monthly (×12) + Annual + Exam = {formatCurrency(
                    (formData.monthly_fee || 0) * 12 +
                    (formData.annual_fee  || 0) +
                    (formData.exam_fee    || 0)
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {saving ? 'Saving...' : 'Save Structure'}
                </button>
                <button onClick={() => setEditing(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}