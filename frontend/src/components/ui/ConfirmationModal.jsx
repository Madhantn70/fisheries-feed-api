import { Button } from './Button';

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-xl space-y-4 animate-in fade-in duration-200">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {title || "Are you sure?"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {message || "This action cannot be undone."}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
