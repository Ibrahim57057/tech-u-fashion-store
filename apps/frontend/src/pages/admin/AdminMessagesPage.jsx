import { useState } from "react";
import { Mail, MailOpen, Reply } from "lucide-react";
import {
  useAdminMessages,
  useUpdateMessage,
} from "../../hooks/useAdminInbox.js";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import Pagination from "../../components/ui/Pagination.jsx";

const statusVariant = { new: "warning", read: "neutral", replied: "success" };
const MESSAGES_PER_PAGE = 20;

/**
 * Inbox for the /contact form. Opening a message marks it read, and the
 * reply button hands the customer a prefilled mailto: so the answer is
 * sent from the admin's own mail client.
 */
export default function AdminMessagesPage() {
  const [page, setPage] = useState(1);
  const { messages, unread, total, isLoading } = useAdminMessages({
    page,
    limit: MESSAGES_PER_PAGE,
  });
  const totalPages = Math.max(1, Math.ceil(total / MESSAGES_PER_PAGE));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className='font-display font-bold text-2xl text-brand-dark'>
          Messages
        </h1>
        {unread > 0 && (
          <Badge variant="warning">
            {unread} unread
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
        </div>
      )}

      {!isLoading && messages.length === 0 && (
        <p className='text-neutral-500'>
          No messages yet. They arrive here from the contact form.
        </p>
      )}

      <div className="space-y-3">
        {messages.map((message) => (
          <MessageRow key={message._id} message={message} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function MessageRow({ message }) {
  const { mutate, isPending } = useUpdateMessage();
  const [open, setOpen] = useState(message.status === "new");

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    // Opening an unread message marks it read; closing never re-marks it,
    // so a status never flip-flops.
    if (nextOpen && message.status === "new") {
      mutate({ id: message._id, status: "read" });
    }
  }

  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(
    `Re: ${message.subject}`,
  )}&body=${encodeURIComponent(`Hi ${message.name},\n\n`)}`;

  return (
    <div className='bg-white border border-neutral-200 rounded-card'>
      <button
        type='button'
        onClick={toggle}
        className='w-full flex items-center justify-between p-4 text-left'>
        <div className='flex items-start gap-3'>
          {message.status === "new" ? (
            <Mail className='w-4 h-4 text-brand-accent shrink-0 mt-0.5' />
          ) : (
            <MailOpen className='w-4 h-4 text-neutral-400 shrink-0 mt-0.5' />
          )}
          <div>
            <p
              className={`text-sm ${
                message.status === "new"
                  ? "font-semibold text-brand-dark"
                  : "font-medium text-neutral-600"
              }`}>
              {message.name}
            </p>
            <p className='text-xs text-neutral-500'>
              {message.email} · {message.subject}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className='text-xs text-neutral-400 hidden sm:block'>
            {new Date(message.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <Badge variant={statusVariant[message.status]}>
            {message.status}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3">
          <p className='text-sm text-neutral-700 whitespace-pre-line'>
            {message.message}
          </p>
          {message.user && (
            <p className='text-xs text-neutral-400 mt-2'>
              Sent by a registered account.
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <a href={mailto} onClick={() => mutate({ id: message._id, status: "replied" })}>
              <Button size='sm' variant='outline'>
                <Reply className='w-4 h-4 mr-1.5' />
                Reply
              </Button>
            </a>
            {message.status !== "replied" && (
              <Button
                size='sm'
                variant='outline'
                disabled={isPending}
                onClick={() => mutate({ id: message._id, status: "replied" })}>
                Mark replied
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}