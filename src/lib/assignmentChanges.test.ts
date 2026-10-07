import { describe, expect, it } from 'vitest';
import { assignmentChanges } from './assignmentChanges';

describe('assignmentChanges', () => {
  it('notifies only newly assigned users when editing', () => {
    expect(assignmentChanges(['ana', 'bia'], ['bia', 'caio'])).toEqual({ added: ['caio'], removed: ['ana'] });
  });
  it('does not duplicate assignments', () => {
    expect(assignmentChanges(['ana'], ['ana', 'ana'])).toEqual({ added: [], removed: [] });
  });
});