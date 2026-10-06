import { useState } from "react";
import {
  useAdminDeliveryZones,
  useSaveDeliveryZone,
} from "../../hooks/useAdminDeliveryZones.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

export default function AdminDeliveryZonesPage() {
  const { data: zones, isLoading } = useAdminDeliveryZones();
  const { mutate: save } = useSaveDeliveryZone();
  const [newZone, setNewZone] = useState({
    name: "",
    fee: "",
    etaDays: "",
    codAllowed: false,
  });

  function handleAdd(e) {
    e.preventDefault();
    save(
      {
        data: {
          name: newZone.name,
          fee: Math.round(Number(newZone.fee) * 100),
          etaDays: newZone.etaDays,
          codAllowed: newZone.codAllowed,
        },
      },
      {
        onSuccess: () =>
          setNewZone({ name: "", fee: "", etaDays: "", codAllowed: false }),
      },
    );
  }

  return (
    <div>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Delivery zones
      </h1>

      {!isLoading && (
        <div className='bg-white rounded-card border border-neutral-200 divide-y divide-neutral-100 mb-6'>
          {zones.map((zone) => (
            <ZoneRow key={zone.id} zone={zone} onSave={save} />
          ))}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className='bg-white rounded-card border border-neutral-200 p-4 space-y-3 max-w-md'>
        <h2 className='font-body font-semibold text-sm text-brand-dark'>
          Add a new zone
        </h2>
        <Input
          label='Name'
          value={newZone.name}
          onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
          required
        />
        <Input
          label='Fee (₦)'
          type='number'
          min='0'
          value={newZone.fee}
          onChange={(e) => setNewZone({ ...newZone, fee: e.target.value })}
          required
        />
        <Input
          label='Delivery time (e.g. 1-2)'
          value={newZone.etaDays}
          onChange={(e) => setNewZone({ ...newZone, etaDays: e.target.value })}
          required
        />
        <label className='flex items-center gap-2 text-sm text-neutral-700'>
          <input
            type='checkbox'
            checked={newZone.codAllowed}
            onChange={(e) =>
              setNewZone({ ...newZone, codAllowed: e.target.checked })
            }
            className='accent-brand-accent'
          />
          Allow pay on delivery here
        </label>
        <Button type='submit' size='sm'>
          Add zone
        </Button>
      </form>
    </div>
  );
}

function ZoneRow({ zone, onSave }) {
  const [fee, setFee] = useState(zone.fee / 100);
  const [codAllowed, setCodAllowed] = useState(zone.codAllowed);

  function handleBlur() {
    onSave({ id: zone.id, data: { fee: Math.round(Number(fee) * 100) } });
  }

  function handleCodToggle(e) {
    const value = e.target.checked;
    setCodAllowed(value);
    onSave({ id: zone.id, data: { codAllowed: value } });
  }

  return (
    // flex-wrap: the checkbox label plus the fee field come to about 211px
    // on their own, and with the zone name the row no longer fits a phone.
    <div className='flex flex-wrap items-center justify-between gap-3 p-4'>
      <div className='min-w-0'>
        <p className='font-medium text-brand-dark text-sm'>{zone.name}</p>
        <p className='text-xs text-neutral-500'>{zone.etaDays} days</p>
      </div>
      <div className='flex flex-wrap items-center gap-4'>
        <label className='flex items-center gap-1.5 text-xs text-neutral-600'>
          <input
            type='checkbox'
            checked={codAllowed}
            onChange={handleCodToggle}
            className='accent-brand-accent'
          />
          Pay on delivery
        </label>
        <div className='flex items-center gap-1 text-sm'>
          ₦
          <input
            type='number'
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            onBlur={handleBlur}
            className='w-20 border border-neutral-300 rounded px-2 py-1'
          />
        </div>
      </div>
    </div>
  );
}
