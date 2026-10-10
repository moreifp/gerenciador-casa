-- Segurança (10/10/2026)
-- 1) Recibos privados: só a dona do recibo ou um admin consegue abrir (links assinados no app).
update storage.buckets set public = false where id = 'receipt-images';
drop policy if exists "Public read receipts" on storage.objects;
drop policy if exists "Owner or admin read receipts" on storage.objects;
create policy "Owner or admin read receipts" on storage.objects for select to authenticated
  using (bucket_id = 'receipt-images' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.has_role((select auth.uid()), 'admin')));

-- 2) Funções de gatilho não podem ser chamadas pela API (/rest/v1/rpc). Os gatilhos continuam funcionando.
revoke execute on function public.handle_invitation_signup() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_proof_submitted() from public, anon, authenticated;
revoke execute on function public.notify_task_assigned() from public, anon, authenticated;
revoke execute on function public.notify_task_reply() from public, anon, authenticated;
revoke execute on function public.on_task_completed() from public, anon, authenticated;
revoke execute on function public.on_task_question() from public, anon, authenticated;
revoke execute on function public.on_task_uncompleted() from public, anon, authenticated;
revoke execute on function public.recalc_profile_initials() from public, anon, authenticated;
