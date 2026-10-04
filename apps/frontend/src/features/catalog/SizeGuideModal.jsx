import Modal from "../../components/ui/Modal.jsx";

const sizeChart = [
  { eu: "39", uk: "6", us: "7" },
  { eu: "40", uk: "6.5", us: "7.5" },
  { eu: "41", uk: "7.5", us: "8.5" },
  { eu: "42", uk: "8", us: "9" },
  { eu: "43", uk: "9", us: "10" },
  { eu: "44", uk: "9.5", us: "10.5" },
];

export default function SizeGuideModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title='Size guide'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-neutral-500 border-b border-neutral-200'>
            <th className='pb-2'>EU</th>
            <th className='pb-2'>UK</th>
            <th className='pb-2'>US</th>
          </tr>
        </thead>
        <tbody>
          {sizeChart.map((row) => (
            <tr key={row.eu} className='border-b border-neutral-100'>
              <td className='py-2 text-brand-dark font-medium'>{row.eu}</td>
              <td className='py-2 text-neutral-600'>{row.uk}</td>
              <td className='py-2 text-neutral-600'>{row.us}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className='text-xs text-neutral-500 mt-4'>
        Measurements are approximate. For the best fit, measure your foot in the
        evening when it's largest.
      </p>
    </Modal>
  );
}
