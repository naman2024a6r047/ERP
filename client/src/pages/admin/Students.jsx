import { useState, useEffect } from 'react';
import API from '../../utils/api';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Avatar from '../../components/common/Avatar';
import StudentForm from '../../components/forms/StudentForm';
import { feeStatusColor } from '../../utils/helpers';
import { CLASSES, SECTIONS } from '../../constants/roles';
import toast from 'react-hot-toast';

export default function Students() {
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [credentials, setCredentials] = useState(null);

  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');

  const load = (q = '', c = filterClass, s = filterSection) => {
    setLoading(true);
    let url = `/students?search=${q}`;
    if (c) url += `&class=${c}`;
    if (s) url += `&section=${s}`;
    
    API.get(url)
      .then(r => setStudents(r.data.students || []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilterChange = (c, s) => {
    setFilterClass(c);
    setFilterSection(s);
    load(search, c, s);
  };

  const openAdd  = () => { setEditing(null); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setShowModal(true); };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await API.put(`/students/${editing.id}`, data);
        toast.success('Student updated!');
      } else {
        const res = await API.post('/students', data);
        setCredentials(res.data.credentials || null);
        toast.success('Student added and credentials generated!');
      }
      setShowModal(false);
      load(search, filterClass, filterSection);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this student?')) return;
    try {
      await API.delete(`/students/${id}`);
      toast.success('Student deactivated.');
      load(search, filterClass, filterSection);
    } catch {
      toast.error('Failed.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={filterClass}
            onChange={(e) => handleFilterChange(e.target.value, filterSection)}
            className="flex-1 sm:w-32 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-3 py-2.5"
          >
            <option value="">All Classes</option>
            {CLASSES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select 
            value={filterSection}
            onChange={(e) => handleFilterChange(filterClass, e.target.value)}
            className="flex-1 sm:w-28 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-3 py-2.5"
          >
            <option value="">All Sections</option>
            {SECTIONS.map(s => (
              <option key={s} value={s}>Sec {s}</option>
            ))}
          </select>
        </div>
        <SearchBar
          placeholder="Search by name, ID or class..."
          onChange={q => { setSearch(q); load(q, filterClass, filterSection); }}
          className="flex-1"
        />
        <button
          onClick={openAdd}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          + Add Student
        </button>
      </div>

      {/* Table — horizontally scrollable on mobile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '600px' }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Student', 'Class', 'Parent', 'Phone', 'Fee', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate max-w-[120px] sm:max-w-none">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 text-xs">
                      {s.class} - {s.section}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs max-w-[100px] truncate">
                      {s.parent_name}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {s.parent_phone}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feeStatusColor[s.fee_status] || 'bg-gray-100 text-gray-500'}`}>
                        {s.fee_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setCredentials(null); }}
        title={editing ? 'Edit Student' : 'Add New Student'}
      >
        {credentials && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-semibold">Student login credentials</p>
            <p>Email: <span className="font-mono">{credentials.email}</span></p>
            <p>Password: <span className="font-mono">{credentials.password}</span></p>
          </div>
        )}
        <StudentForm
          onSubmit={handleSubmit}
          loading={saving}
          defaultValues={editing || {}}
        />
      </Modal>
    </div>
  );
}
