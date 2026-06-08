import { useState, useEffect } from 'react';
import API from '../../utils/api';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import Avatar from '../../components/common/Avatar';
import TeacherForm from '../../components/forms/TeacherForm';
import { useAuth } from '../../context/AuthContext';
import { can, isSuperAdmin } from '../../utils/roleUtils';
import toast from 'react-hot-toast';

export default function Teachers() {
  const { user }  = useAuth();
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);

  //  Both admin and admin2 can view teachers
  const canView    = can(user, 'VIEW_TEACHERS');
  //  Only super admin can edit/delete
  const canManage  = isSuperAdmin(user);

  const load = (q = '') => {
    setLoading(true);
    API.get(`/teachers?search=${q}`)
      .then(r => setTeachers(r.data))
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setShowModal(true); };
  const openEdit = (t) => { setEditing(t); setShowModal(true); };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        assigned_classes: Array.isArray(data.assigned_classes_arr)
          ? data.assigned_classes_arr.join(',')
          : data.assigned_classes || '',
      };

      if (editing) {
        await API.put(`/teachers/${editing.id}`, payload);
        toast.success('Teacher updated!');
      } else {
        await API.post('/teachers', payload);
        toast.success('Teacher added!');
      }
      setShowModal(false);
      load(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this teacher?')) return;
    try {
      await API.delete(`/teachers/${id}`);
      toast.success('Teacher deactivated.');
      load(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    }
  };

  const columns = [
    {
      key: 'name', label: 'Teacher',
      render: (val, row) => {
        const photoUrl = row.teacherUser?.profile_photo
          ? `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : ''}${row.teacherUser.profile_photo}`
          : undefined;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={val} size="sm" src={photoUrl} />
            <div>
              <p className="font-medium text-gray-800 text-sm">{val}</p>
              <p className="text-xs text-gray-400 font-mono">{row.teacher_id}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'subject', label: 'Subject',
      render: val => (
        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{val}</span>
      )
    },
    {
      key: 'email', label: 'Email',
      render: val => <span className="text-xs text-gray-500 font-medium">{val || '—'}</span>
    },
    {
      key: 'assigned_classes', label: 'Classes',
      render: val => <span className="text-xs text-gray-500">{val || '—'}</span>
    },
    {
      key: 'phone', label: 'Phone',
      render: val => <span className="text-xs text-gray-500 font-medium">{val || '—'}</span>
    },
    {
      key: 'status', label: 'Status',
      render: val => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          val === 'active'   ? 'bg-green-100 text-green-700' :
          val === 'leave'    ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-500'
        }`}>{val}</span>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          placeholder="Search teachers..."
          onChange={q => { setSearch(q); load(q); }}
          className="flex-1"
        />
        {/*  Only super admin sees Add button */}
        {canManage && (
          <button
            onClick={openAdd}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            + Add Teacher
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        emptyText="No teachers found."
        actions={(row) => (
          <div className="flex gap-3">
            {/*  Only super admin gets Edit/Remove */}
            {canManage ? (
              <>
                <button onClick={() => openEdit(row)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Edit</button>
                <button onClick={() => handleDelete(row.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
              </>
            ) : (
              <span className="text-xs text-gray-400">View only</span>
            )}
          </div>
        )}
      />

      {canManage && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Teacher' : 'Add New Teacher'}
        >
          <TeacherForm
            onSubmit={handleSubmit}
            loading={saving}
            defaultValues={editing ? {
              ...editing,
              assigned_classes_arr: editing.assigned_classes?.split(',').map(s => s.trim()) || [],
            } : {}}
          />
        </Modal>
      )}
    </div>
  );
}