-- Grant the service_role full table access so server-side code can bypass RLS.
-- Supabase does this automatically for tables created via the dashboard but
-- not for tables created via custom migrations.
GRANT ALL ON TABLE public.entities  TO service_role;
GRANT ALL ON TABLE public.news_items TO service_role;
GRANT ALL ON TABLE public.profiles  TO service_role;

-- Sequence access is needed for any serial/identity columns added in the future.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
