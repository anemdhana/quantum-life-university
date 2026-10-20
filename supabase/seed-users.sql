-- Local sample logins. Safe to re-run.
-- admin@qlu.local  / Lotus-River-Admin-2026!   (profiles.role = admin)
-- reader@qlu.local / Lotus-River-Reader-2026!  (profiles.role = user)

do $$
declare
  samples jsonb := '[
    {"id":"a0000000-0000-4000-8000-000000000001","email":"admin@qlu.local","password":"Lotus-River-Admin-2026!","name":"Sample Admin","role":"admin"},
    {"id":"a0000000-0000-4000-8000-000000000002","email":"reader@qlu.local","password":"Lotus-River-Reader-2026!","name":"Sample Reader","role":"user"}
  ]';
  sample jsonb;
begin
  for sample in select value from jsonb_array_elements(samples)
  loop
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      email_change_token_current,
      reauthentication_token,
      is_sso_user,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      (sample->>'id')::uuid,
      'authenticated',
      'authenticated',
      sample->>'email',
      extensions.crypt(sample->>'password', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', sample->>'name'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      false,
      false
    )
    on conflict (id) do update set
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      sample->>'id',
      (sample->>'id')::uuid,
      jsonb_build_object(
        'sub', sample->>'id',
        'email', sample->>'email',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do update set
      identity_data = excluded.identity_data,
      updated_at = now();

    update public.profiles
    set
      role = sample->>'role',
      email = sample->>'email',
      full_name = sample->>'name',
      updated_at = now()
    where id = (sample->>'id')::uuid;
  end loop;
end $$;
