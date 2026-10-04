import { useState } from "react";
import { Download } from "lucide-react";
import { useAdminSubscribers } from "../../hooks/useAdminInbox.js";
import { apiFetchWithMeta } from "../../lib/apiClient.js";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import Pagination from "../../components/ui/Pagination.jsx";

const SUBSCRIBERS_PER_PAGE = 20;

/**
 * Newsletter list. "Export CSV" is built in the browser from data we
 * already have — no endpoint needed, and it can't leak to anyone who
 * shouldn't see the list.
 */
export default function AdminSubscribersPage() {
  const [page, setPage] = useState(1);
  const { subscribers, active, total, isLoading } = useAdminSubscribers({
    page,
    limit: SUBSCRIBERS_PER_PAGE,
  });
  const [exporting, setExporting] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / SUBSCRIBERS_PER_PAGE));

  /**
   * The list is paginated, so exporting only what is on screen would quietly
   * produce a truncated file that looks complete. This walks every page first,
   * so the CSV always matches the "N total" figure shown above the table.
   */
  async function exportCsv() {
    setExporting(true);
    try {
      const all = [];
      const pages = Math.max(1, Math.ceil(total / 100));
      for (let p = 1; p <= pages; p++) {
        const envelope = await apiFetchWithMeta(
          `/newsletter/subscribers?page=${p}&limit=100`,
        );
        all.push(...(envelope.data ?? []));
      }

      const header = [
        "email",
        "name",
        "status",
        "subscribed_at",
        "unsubscribed_at",
      ];
      const rows = all.map((s) => [
        s.email,
        s.name ?? "",
        s.unsubscribedAt ? "unsubscribed" : "active",
        s.createdAt,
        s.unsubscribedAt ?? "",
      ]);

      // Quote every field so a comma inside a name can't shift the columns.
      const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [header, ...rows]
        .map((row) => row.map(escape).join(","))
        .join("\r\n");

      // The BOM makes Excel read it as UTF-8 rather than mangling accents.
      const blob = new Blob(["﻿" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `techu-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className='font-display font-bold text-2xl text-brand-dark'>
          Newsletter subscribers
        </h1>
        {total > 0 && (
          <Button size='sm' variant='outline' onClick={exportCsv} disabled={exporting}>
            <Download className='w-4 h-4 mr-1.5' />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        )}
      </div>

      {total > 0 && (
        <p className='text-sm text-neutral-500 mb-4'>
          {active} active of {total} total
        </p>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      )}

      {!isLoading && subscribers.length === 0 && (
        <p className='text-neutral-500'>
          No subscribers yet. They sign up from the footer form.
        </p>
      )}

      {!isLoading && subscribers.length > 0 && (
        <div className='bg-white border border-neutral-200 rounded-card overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-neutral-50 text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold text-brand-dark'>
                  Email
                </th>
                <th className='px-4 py-3 font-semibold text-brand-dark'>
                  Name
                </th>
                <th className='px-4 py-3 font-semibold text-brand-dark'>
                  Status
                </th>
                <th className='px-4 py-3 font-semibold text-brand-dark'>
                  Date
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-neutral-100'>
              {subscribers.map((s) => (
                <tr key={s._id}>
                  <td className='px-4 py-3 text-neutral-700 break-all'>
                    {s.email}
                  </td>
                  <td className='px-4 py-3 text-neutral-600'>
                    {s.name || "—"}
                  </td>
                  <td className='px-4 py-3'>
                    <Badge variant={s.unsubscribedAt ? "neutral" : "success"}>
                      {s.unsubscribedAt ? "unsubscribed" : "active"}
                    </Badge>
                  </td>
                  <td className='px-4 py-3 text-neutral-500 whitespace-nowrap'>
                    {new Date(s.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}