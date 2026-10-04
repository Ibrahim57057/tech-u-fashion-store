import { useState } from "react";
import {
  useAdminUsers,
  useUpdateUserRole,
  useUpdateUserStatus,
} from "../../hooks/useAdminUsers.js";
import { useAuth } from "../../hooks/useAuth.js";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import Pagination from "../../components/ui/Pagination.jsx";

const PER_PAGE = 20;

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const { data, isLoading } = useAdminUsers({ page, limit: PER_PAGE });
  const { mutate: updateRole, isPending: rolePending } = useUpdateUserRole();
  const { mutate: updateStatus, isPending: statusPending } = useUpdateUserStatus();
  const { user: currentUser } = useAuth();

  // apiFetchWithMeta hands back the whole envelope, so `data` is
  // { data: users, meta }.
  const users = data?.data;
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <h1 className='font-display font-bold text-2xl text-brand-dark mb-6'>
        Users
      </h1>

      {/* The server is the authority here (it refuses to suspend yourself or
          the last active admin), so a refusal is surfaced rather than swallowed
          — otherwise the button appears to do nothing. */}
      {error && (
        <div className='mb-4 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      )}

      <div className='bg-white rounded-card border border-neutral-200 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='bg-neutral-50 text-left text-neutral-500'>
            <tr>
              <th className='p-3'>Name</th>
              <th className='p-3'>Email</th>
              <th className='p-3'>Role</th>
              <th className='p-3'>Status</th>
              <th className='p-3'></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-neutral-100'>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className='p-3'>
                    <Skeleton className='h-8 w-full' />
                  </td>
                </tr>
              ))}

            {users?.map((u) => {
              const isSelf = u._id === currentUser.id;
              return (
                <tr key={u._id}>
                  <td className='p-3 text-brand-dark'>{u.name}</td>
                  <td className='p-3 text-neutral-600'>{u.email}</td>
                  <td className='p-3'>
                    <Badge variant={u.role === "admin" ? "success" : "neutral"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className='p-3'>
                    {u.isActive === false ? (
                      <Badge variant="danger">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  <td className='p-3 text-right'>
                    {!isSelf && (
                      <div className='flex items-center justify-end gap-2'>
                        <select
                          value={u.role}
                          disabled={rolePending}
                          onChange={(e) =>
                            updateRole({ id: u._id, role: e.target.value })
                          }
                          className='border border-neutral-300 rounded-card text-sm px-2 py-1'>
                          <option value='customer'>Customer</option>
                          <option value='staff'>Staff</option>
                          <option value='admin'>Admin</option>
                        </select>
                        <Button
                          variant={
                            u.isActive === false ? 'primary' : 'outline'
                          }
                          size='sm'
                          disabled={statusPending}
                          onClick={() => {
                            setError(null);
                            updateStatus(
                              { id: u._id, isActive: u.isActive === false },
                              { onError: (err) => setError(err.message) },
                            );
                          }}>
                          {u.isActive === false ? 'Reinstate' : 'Suspend'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
