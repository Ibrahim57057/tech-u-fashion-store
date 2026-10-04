export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className='bg-white rounded-card border border-neutral-200 p-4 flex items-center gap-3'>
      <div className='bg-orange-50 p-2 rounded-card'>
        <Icon className='w-5 h-5 text-brand-accent' />
      </div>
      <div>
        <p className='text-xs text-neutral-500'>{label}</p>
        <p className='font-display font-bold text-xl text-brand-dark'>
          {value}
        </p>
      </div>
    </div>
  );
}
