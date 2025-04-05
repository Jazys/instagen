# Init supabase project

Kepp default configuration from default project (like auth provider, ...)

## Overview

To use project, you need to init supabase DB only using initSupaDB.sql.
Other files are older and not be used

## To backup data (add the trigger to setup profile after creation)
Use this command line in linux

export PGPASSWORD="password_supabase"
/usr/lib/postgresql/15/bin/pg_dump -h aws-0-eu-central-1.pooler.supabase.com -U postgres.ID_PROJECT -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --schema=public \
  --schema-only \
  --exclude-schema=auth \
  --exclude-schema=_realtime \
  --exclude-schema=internal \
  --exclude-schema=pgbouncer \
  -f supabase_backup_test.sql

  And add this trigger in backup 
```
    --
    -- Name: auth.users on_auth_user_created; Type: TRIGGER; Schema: public; Owner: -
    --
    CREATE TRIGGER on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user(); 
```
