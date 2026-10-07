import { describe, expect, it } from 'vitest';
import { profileInitials } from './initials';

describe('profile initials', () => {
  it('uses first name and last surname', () => expect(profileInitials('Vanderlaine de Souza')).toBe('VS'));
  it('uses X for one name', () => expect(profileInitials('Angela')).toBe('AX'));
  it('uses X for another one-name employee', () => expect(profileInitials('Ronildo')).toBe('RX'));
});