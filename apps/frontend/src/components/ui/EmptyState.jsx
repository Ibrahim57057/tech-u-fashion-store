import { Link } from "react-router-dom";
import Button from "./Button.jsx";

/**
 * Generic "nothing here" block — reused for empty cart, empty search
 * results, empty order history. Same composition principle as Card:
 * the specific message and action are supplied by the caller.
 */
export default function EmptyState({
  title,
  message,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className='flex flex-col items-center justify-center text-center px-6 py-16'>
      <h3 className='font-display font-semibold text-brand-dark mb-1'>
        {title}
      </h3>
      <p className='text-sm text-neutral-500 mb-4'>{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} onClick={onAction}>
          <Button size='sm'>{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
