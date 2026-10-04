import { useState } from "react";
import {
  useAdminReturns,
  useUpdateReturn,
} from "../../hooks/useAdminReturns.js";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import { formatNaira } from "../../lib/formatNaira.js";

const statusVariant = {
  requested: "warning",
  approved: "success",
  rejected: "danger",
  completed: "neutral",
};

const RETURNS_PER_PAGE = 20;

export default function AdminReturnsPage() {
  const [page, setPage] = useState(1);
  const { returns, total, isLoading } = useAdminReturns({
    page,
    limit: RETURNS_PER_PAGE,
  });
  const totalPages = Math.max(1, Math.ceil(total / RETURNS_PER_PAGE));

  return (
    <div>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Return requests
      </h1>

      {isLoading && (
        <div className='space-y-3'>
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
        </div>
      )}

      {!isLoading && returns.length === 0 && (
        <p className='text-neutral-500'>No return requests yet.</p>
      )}

      <div className='space-y-3'>
        {returns?.map((r) => (
          <ReturnRow key={r._id} returnRequest={r} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function ReturnRow({ returnRequest }) {
  const { mutate, isPending } = useUpdateReturn();
  const [note, setNote] = useState(returnRequest.adminNote || "");

  const isPending_ = returnRequest.status === "requested";

  return (
    <div className='bg-white border border-neutral-200 rounded-card p-4'>
      <div className='flex items-center justify-between mb-2'>
        <div>
          <p className='font-medium text-brand-dark text-sm'>
            {returnRequest.order.orderNumber}
          </p>
          <p className='text-xs text-neutral-500'>
            {returnRequest.user.name} · {returnRequest.user.email}
          </p>
        </div>
        <Badge variant={statusVariant[returnRequest.status]}>
          {returnRequest.status}
        </Badge>
      </div>

      <p className='text-sm text-neutral-600 mb-1'>{returnRequest.reason}</p>
      <p className='text-xs text-neutral-400 mb-3'>
        Order total: {formatNaira(returnRequest.order.total)}
      </p>

      {isPending_ && (
        <div className='flex items-center gap-2'>
          <input
            type='text'
            placeholder='Note (optional)'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className='flex-1 border border-neutral-300 rounded-card px-3 py-1.5 text-sm'
          />
          <Button
            size='sm'
            variant='outline'
            disabled={isPending}
            onClick={() =>
              mutate({
                id: returnRequest._id,
                status: "rejected",
                adminNote: note,
              })
            }>
            Reject
          </Button>
          <Button
            size='sm'
            disabled={isPending}
            onClick={() =>
              mutate({
                id: returnRequest._id,
                status: "approved",
                adminNote: note,
              })
            }>
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}
