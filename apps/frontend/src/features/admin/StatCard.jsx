export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className='bg-white rounded-card border border-neutral-200 p-4 flex items-center gap-3 min-w-0'>
      <div className='bg-orange-50 p-2 rounded-card shrink-0'>
        <Icon className='w-5 h-5 text-brand-accent' />
      </div>
      {/* min-w-0 so the label can truncate. In a 2-up grid at 320px the
          card is 128px, and "Pending payment" at text-xs was overflowing
          it rather than shortening. */}
      <div className='min-w-0'>
        <p className='text-xs text-neutral-500 truncate'>{label}</p>
        <p className='font-display font-bold text-lg sm:text-xl text-brand-dark break-words'>
          {value}
        </p>
      </div>
    </div>
  );
}
