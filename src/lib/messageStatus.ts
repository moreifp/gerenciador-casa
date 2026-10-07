/** Task completion takes precedence in the admin message list, not in delivery logs. */
export function messageStatus(deliveryStatus: string, taskStatus?: string | null): string {
  return taskStatus === 'completed' ? 'completed' : deliveryStatus;
}