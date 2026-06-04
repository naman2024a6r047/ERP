import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CLASSES, SUBJECTS } from '../../constants/roles';

export default function TeacherForm({ onSubmit, defaultValues = {}, loading = false }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });
  useEffect(() => { reset(defaultValues); }, [JSON.stringify(defaultValues)]);

  const f = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all';
  const e = 'text-red-500 text-xs mt-0.5';
  const l = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={l}>Full Name *</label>
        <input {...register('name', { required: 'Required' })} className={f} placeholder="Mrs. Sunita Verma" />
        {errors.name && <p className={e}>{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={l}>Subject *</label>
          <select {...register('subject', { required: 'Required' })} className={f}>
            <option value="">Select</option>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          {errors.subject && <p className={e}>{errors.subject.message}</p>}
        </div>
        <div>
          <label className={l}>Qualification</label>
          <input {...register('qualification')} className={f} placeholder="M.Sc, B.Ed" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={l}>Phone *</label>
          <input {...register('phone', { required: 'Required' })} className={f} placeholder="9901234567" />
          {errors.phone && <p className={e}>{errors.phone.message}</p>}
        </div>
        <div>
          <label className={l}>Email</label>
          <input type="email" {...register('email')} className={f} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={l}>Join Date</label>
          <input type="date" {...register('join_date')} className={f} />
        </div>
        <div>
          <label className={l}>Status</label>
          <select {...register('status')} className={f}>
            <option value="active">Active</option>
            <option value="leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className={l}>Assigned Classes</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {CLASSES.map(c => (
            <label key={c} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" value={c} {...register('assigned_classes_arr')}
                className="accent-blue-500" />
              {c}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
        {loading ? 'Saving...' : (defaultValues?.id ? 'Update Teacher' : 'Add Teacher')}
      </button>
    </form>
  );
}