import { describe, expect, it } from 'vitest';
import { messageStatus } from './messageStatus';

describe('admin WhatsApp message status', () => {
  it('shows completed when the associated task is completed', () => {
    expect(messageStatus('sent', 'completed')).toBe('completed');
  });
  it('keeps sent for a task that is still pending', () => {
    expect(messageStatus('sent', 'pending')).toBe('sent');
  });
  it('keeps delivery failures and queued messages distinguishable', () => {
    expect(messageStatus('failed', 'pending')).toBe('failed');
    expect(messageStatus('queued', null)).toBe('queued');
  });
});