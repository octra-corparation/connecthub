'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

interface ReportModalProps {
  targetType: 'POST' | 'COMMENT' | 'USER';
  postId?: string;
  commentId?: string;
  reportedUserId?: string;
  onClose: () => void;
}

const REASONS = ['Spam', 'Harassment or bullying', 'Hate speech', 'Misinformation', 'Inappropriate content', 'Other'];

export function ReportModal({ targetType, postId, commentId, reportedUserId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        targetType,
        reason: details ? `${reason}: ${details}` : reason,
        postId,
        commentId,
        reportedUserId,
      });
      toast.success('Report submitted. Thank you for helping keep ConnectHub safe.');
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card-surface w-full max-w-sm rounded-2xl p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Report {targetType.toLowerCase()}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-brand-500" />
              {r}
            </label>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Additional details (optional)"
          rows={2}
          className="input-field mt-3"
        />

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary mt-4 w-full">
          Submit report
        </button>
      </div>
    </div>
  );
}
