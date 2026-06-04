-- CRASH Cifras — Storage de fotos dos ministros

insert into storage.buckets (id, name, public)
values ('ministros', 'ministros', true)
on conflict (id) do update set public = true;

drop policy if exists "ministros_storage_select_public" on storage.objects;
create policy "ministros_storage_select_public"
  on storage.objects for select
  using (bucket_id = 'ministros');

drop policy if exists "ministros_storage_insert_own_folder" on storage.objects;
create policy "ministros_storage_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'ministros'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "ministros_storage_update_own_folder" on storage.objects;
create policy "ministros_storage_update_own_folder"
  on storage.objects for update
  using (
    bucket_id = 'ministros'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'ministros'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "ministros_storage_delete_own_folder" on storage.objects;
create policy "ministros_storage_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'ministros'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
