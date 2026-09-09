
-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('student','investor','university','admin');
CREATE TYPE public.startup_status AS ENUM ('draft','pending','approved','rejected');
CREATE TYPE public.request_kind AS ENUM ('connection','dataroom');
CREATE TYPE public.request_status AS ENUM ('pending','accepted','declined','cancelled');
CREATE TYPE public.access_status AS ENUM ('pending','granted','revoked');
CREATE TYPE public.meeting_status AS ENUM ('requested','confirmed','declined','cancelled');
CREATE TYPE public.program_status AS ENUM ('open','running','closed','archived');

-- ============ shared helpers ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ profiles + roles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'university') OR public.has_role(auth.uid(),'admin'));

-- new user bootstrap: profile + role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name',''),
          COALESCE(NEW.email,''),
          COALESCE(NEW.raw_user_meta_data->>'organization',''))
  ON CONFLICT (id) DO NOTHING;

  BEGIN r := COALESCE(NEW.raw_user_meta_data->>'role','student')::public.app_role;
  EXCEPTION WHEN others THEN r := 'student'; END;
  IF r = 'admin' THEN r := 'student'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;

  IF r = 'investor' THEN
    INSERT INTO public.investor_profiles (user_id, name, organization)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','Investor'),
            COALESCE(NEW.raw_user_meta_data->>'organization',''));
  ELSIF r = 'student' THEN
    INSERT INTO public.students (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''));
  END IF;
  RETURN NEW;
END; $$;

-- ============ students ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  university TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "student self read" ON public.students FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'university'));
CREATE POLICY "student self insert" ON public.students FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "student self update" ON public.students FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND verified = (SELECT s.verified FROM public.students s WHERE s.id = students.id));
CREATE POLICY "university verifies students" ON public.students FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'university')) WITH CHECK (public.has_role(auth.uid(),'university'));

-- ============ investors ============
CREATE TABLE public.investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Angel',
  sectors TEXT[] NOT NULL DEFAULT '{}',
  stages TEXT[] NOT NULL DEFAULT '{}',
  ticket_min BIGINT NOT NULL DEFAULT 0,
  ticket_max BIGINT NOT NULL DEFAULT 0,
  geography TEXT NOT NULL DEFAULT '',
  thesis TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER investors_updated BEFORE UPDATE ON public.investor_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "investors readable" ON public.investor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "investor self insert" ON public.investor_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "investor self update" ON public.investor_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_investor_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.investor_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============ startups ============
CREATE TABLE public.startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT 'Other',
  stage TEXT NOT NULL DEFAULT 'Idea',
  location TEXT NOT NULL DEFAULT '',
  university TEXT NOT NULL DEFAULT '',
  team_size INT NOT NULL DEFAULT 1,
  funding_required BIGINT NOT NULL DEFAULT 0,
  revenue BOOLEAN NOT NULL DEFAULT false,
  monthly_users INT NOT NULL DEFAULT 0,
  problem TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  business_model TEXT NOT NULL DEFAULT '',
  traction TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  deck_path TEXT,
  deck_name TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  github_stars INT,
  github_forks INT,
  github_pushed_at TIMESTAMPTZ,
  github_checked_at TIMESTAMPTZ,
  readiness INT NOT NULL DEFAULT 0,
  status public.startup_status NOT NULL DEFAULT 'draft',
  review_note TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  views INT NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.startups TO authenticated;
GRANT ALL ON public.startups TO service_role;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER startups_updated BEFORE UPDATE ON public.startups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX startups_owner_idx ON public.startups(owner_id);
CREATE INDEX startups_status_idx ON public.startups(status);
CREATE INDEX startups_sector_idx ON public.startups(sector);
CREATE INDEX startups_stage_idx ON public.startups(stage);
CREATE INDEX startups_university_idx ON public.startups(university);

CREATE OR REPLACE FUNCTION public.owns_startup(_startup UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.startups WHERE id = _startup AND owner_id = auth.uid());
$$;

CREATE POLICY "startups visible" ON public.startups FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR status = 'approved' OR is_demo OR public.has_role(auth.uid(),'university'));
CREATE POLICY "founder creates startup" ON public.startups FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(),'student'));
CREATE POLICY "founder updates startup" ON public.startups FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "university reviews startup" ON public.startups FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'university')) WITH CHECK (public.has_role(auth.uid(),'university'));
CREATE POLICY "founder deletes startup" ON public.startups FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.startup_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL DEFAULT '',
  previous_status public.startup_status,
  new_status public.startup_status NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.startup_reviews TO authenticated;
GRANT ALL ON public.startup_reviews TO service_role;
ALTER TABLE public.startup_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX startup_reviews_startup_idx ON public.startup_reviews(startup_id);
CREATE POLICY "review history read" ON public.startup_reviews FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR public.has_role(auth.uid(),'university'));
CREATE POLICY "university writes review" ON public.startup_reviews FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'university') AND reviewer_id = auth.uid());

CREATE TABLE public.readiness_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  score INT NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '[]',
  analysis TEXT NOT NULL DEFAULT '',
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL DEFAULT 'rules',
  version TEXT NOT NULL DEFAULT 'v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.readiness_results TO authenticated;
GRANT ALL ON public.readiness_results TO service_role;
ALTER TABLE public.readiness_results ENABLE ROW LEVEL SECURITY;
CREATE INDEX readiness_startup_idx ON public.readiness_results(startup_id, generated_at DESC);
CREATE POLICY "readiness read" ON public.readiness_results FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR public.has_role(auth.uid(),'university'));
CREATE POLICY "readiness insert" ON public.readiness_results FOR INSERT TO authenticated
  WITH CHECK (public.owns_startup(startup_id));

-- ============ saved / connections ============
CREATE TABLE public.saved_startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, startup_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_startups TO authenticated;
GRANT ALL ON public.saved_startups TO service_role;
ALTER TABLE public.saved_startups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved own" ON public.saved_startups FOR ALL TO authenticated
  USING (investor_id = public.current_investor_id()) WITH CHECK (investor_id = public.current_investor_id());

CREATE TABLE public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  kind public.request_kind NOT NULL DEFAULT 'connection',
  status public.request_status NOT NULL DEFAULT 'pending',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX connection_requests_active_idx
  ON public.connection_requests(startup_id, investor_id, kind) WHERE status = 'pending';
CREATE INDEX connection_requests_status_idx ON public.connection_requests(status);
GRANT SELECT, INSERT, UPDATE ON public.connection_requests TO authenticated;
GRANT ALL ON public.connection_requests TO service_role;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER connreq_updated BEFORE UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "requests visible to parties" ON public.connection_requests FOR SELECT TO authenticated
  USING (investor_id = public.current_investor_id() OR public.owns_startup(startup_id) OR public.has_role(auth.uid(),'university'));
CREATE POLICY "investor creates request" ON public.connection_requests FOR INSERT TO authenticated
  WITH CHECK (investor_id = public.current_investor_id());
CREATE POLICY "parties update request" ON public.connection_requests FOR UPDATE TO authenticated
  USING (investor_id = public.current_investor_id() OR public.owns_startup(startup_id))
  WITH CHECK (investor_id = public.current_investor_id() OR public.owns_startup(startup_id));

-- ============ conversations / messages ============
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (startup_id, investor_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.in_conversation(_conversation UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.startups s ON s.id = c.startup_id
    WHERE c.id = _conversation
      AND (s.owner_id = auth.uid() OR c.investor_id = public.current_investor_id())
  );
$$;

CREATE POLICY "conversation parties read" ON public.conversations FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());
CREATE POLICY "conversation parties create" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());
CREATE POLICY "conversation parties touch" ON public.conversations FOR UPDATE TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id())
  WITH CHECK (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role public.app_role NOT NULL,
  body TEXT NOT NULL,
  read_by_student BOOLEAN NOT NULL DEFAULT false,
  read_by_investor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE POLICY "messages read" ON public.messages FOR SELECT TO authenticated USING (public.in_conversation(conversation_id));
CREATE POLICY "messages send" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.in_conversation(conversation_id) AND sender_id = auth.uid());
CREATE POLICY "messages mark read" ON public.messages FOR UPDATE TO authenticated
  USING (public.in_conversation(conversation_id)) WITH CHECK (public.in_conversation(conversation_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ meetings ============
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Intro call',
  scheduled_at TIMESTAMPTZ NOT NULL,
  minutes INT NOT NULL DEFAULT 30,
  status public.meeting_status NOT NULL DEFAULT 'requested',
  requested_by public.app_role NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER meetings_updated BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX meetings_startup_idx ON public.meetings(startup_id, scheduled_at);
CREATE INDEX meetings_investor_idx ON public.meetings(investor_id, scheduled_at);
CREATE POLICY "meetings parties read" ON public.meetings FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id() OR public.has_role(auth.uid(),'university'));
CREATE POLICY "meetings parties create" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());
CREATE POLICY "meetings parties update" ON public.meetings FOR UPDATE TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id())
  WITH CHECK (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());

-- ============ data room ============
CREATE TABLE public.data_room_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  status public.access_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  downloads INT NOT NULL DEFAULT 0,
  UNIQUE (startup_id, investor_id)
);
GRANT SELECT, INSERT, UPDATE ON public.data_room_access TO authenticated;
GRANT ALL ON public.data_room_access TO service_role;
ALTER TABLE public.data_room_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access parties read" ON public.data_room_access FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id() OR public.has_role(auth.uid(),'university'));
CREATE POLICY "investor requests access" ON public.data_room_access FOR INSERT TO authenticated
  WITH CHECK (investor_id = public.current_investor_id() AND status = 'pending');
CREATE POLICY "founder decides access" ON public.data_room_access FOR UPDATE TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id())
  WITH CHECK (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());

CREATE OR REPLACE FUNCTION public.has_dataroom_access(_startup UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.data_room_access a
    WHERE a.startup_id = _startup
      AND a.investor_id = public.current_investor_id()
      AND a.status = 'granted'
  );
$$;

CREATE TABLE public.data_room_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Product',
  storage_path TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  confidential BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_room_documents TO authenticated;
GRANT ALL ON public.data_room_documents TO service_role;
ALTER TABLE public.data_room_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX documents_startup_idx ON public.data_room_documents(startup_id);
CREATE POLICY "documents read" ON public.data_room_documents FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR public.has_dataroom_access(startup_id));
CREATE POLICY "documents write" ON public.data_room_documents FOR INSERT TO authenticated
  WITH CHECK (public.owns_startup(startup_id));
CREATE POLICY "documents update" ON public.data_room_documents FOR UPDATE TO authenticated
  USING (public.owns_startup(startup_id)) WITH CHECK (public.owns_startup(startup_id));
CREATE POLICY "documents delete" ON public.data_room_documents FOR DELETE TO authenticated
  USING (public.owns_startup(startup_id));

CREATE TABLE public.nda_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'nda-v1',
  accepted_name TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'accepted',
  UNIQUE (startup_id, investor_id, version)
);
GRANT SELECT, INSERT ON public.nda_records TO authenticated;
GRANT ALL ON public.nda_records TO service_role;
ALTER TABLE public.nda_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nda parties read" ON public.nda_records FOR SELECT TO authenticated
  USING (public.owns_startup(startup_id) OR investor_id = public.current_investor_id());
CREATE POLICY "investor accepts nda" ON public.nda_records FOR INSERT TO authenticated
  WITH CHECK (investor_id = public.current_investor_id() AND user_id = auth.uid());

-- ============ programmes ============
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cohort TEXT NOT NULL DEFAULT '',
  seats INT NOT NULL DEFAULT 10 CHECK (seats > 0),
  mentor TEXT NOT NULL DEFAULT '',
  status public.program_status NOT NULL DEFAULT 'open',
  starts_on DATE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER programs_updated BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "programs readable" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "university manages programs" ON public.programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'university')) WITH CHECK (public.has_role(auth.uid(),'university'));

CREATE TABLE public.program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, startup_id)
);
GRANT SELECT, INSERT, DELETE ON public.program_enrollments TO authenticated;
GRANT ALL ON public.program_enrollments TO service_role;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments readable" ON public.program_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "university manages enrollments" ON public.program_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'university')) WITH CHECK (public.has_role(auth.uid(),'university'));

CREATE OR REPLACE FUNCTION public.enforce_program_capacity() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cap INT; taken INT;
BEGIN
  SELECT seats INTO cap FROM public.programs WHERE id = NEW.program_id;
  SELECT count(*) INTO taken FROM public.program_enrollments WHERE program_id = NEW.program_id;
  IF taken >= cap THEN RAISE EXCEPTION 'This programme is full'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER program_capacity BEFORE INSERT ON public.program_enrollments
FOR EACH ROW EXECUTE FUNCTION public.enforce_program_capacity();

-- ============ notifications + audit ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_user_idx ON public.notifications(user_id, read, created_at DESC);
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_actor_idx ON public.audit_logs(actor_id, created_at DESC);
CREATE POLICY "audit own read" ON public.audit_logs FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(),'university'));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- signup trigger last (depends on students/investor_profiles)
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ seed / demo data (owned by nobody, flagged is_demo) ============
INSERT INTO public.startups (name, tagline, sector, stage, location, university, team_size, funding_required, revenue, monthly_users, problem, solution, business_model, traction, readiness, status, verified, views, is_demo) VALUES
('Lumen Labs','Adaptive AI tutor that grades and coaches engineering coursework.','EdTech','Early Traction','Pune, India','COEP Technological University',4,150000,true,6400,'Engineering students get feedback days after submission, so misconceptions compound across a semester.','An adaptive AI tutor that grades submissions in minutes and generates a personalised practice path.','B2B2C campus licences','6.4k MAU, 3 campus pilots',78,'approved',true,126,true),
('CropSense','Low-cost soil sensors with yield forecasting for smallholder farms.','AgriTech','MVP','Nashik, India','VJTI Mumbai',3,80000,false,900,'Smallholder farmers lack affordable soil data.','Low-cost sensors with yield forecasting.','Hardware + subscription','12 farm pilots, 900 monitored acres',64,'approved',true,54,true),
('Vaultly','Compliance automation for student-run fintech products.','FinTech','Prototype','Bengaluru, India','IIIT Bangalore',2,50000,false,120,'Student fintech teams cannot afford compliance reviews.','Automated compliance checks and reporting.','SaaS subscription','Design partners: 2 neobank startups',51,'approved',false,18,true),
('NeuroPulse','Wearable early-warning system for epileptic seizures.','HealthTech','Revenue','Delhi, India','IIT Delhi',6,400000,true,2100,'Seizures strike without warning.','A wearable that predicts seizures minutes ahead.','Device + care subscription','2.1k devices sold, 2 hospital partnerships',84,'approved',true,233,true),
('GridShift','Campus-scale energy optimisation using load forecasting.','ClimateTech','MVP','Hyderabad, India','IIIT Hyderabad',5,220000,false,40,'Campuses waste energy on unmanaged loads.','Load forecasting and automated scheduling.','B2B SaaS','18% energy savings in 3-building pilot',69,'approved',true,61,true),
('Signal Forge','Developer tooling for on-device machine learning.','AI','Early Traction','Chennai, India','Anna University',4,180000,true,1500,'Shipping on-device ML models is slow and error prone.','A toolchain that compiles and benchmarks models for edge devices.','Usage-based SaaS','1.5k monthly developers',73,'approved',true,147,true);

INSERT INTO public.investor_profiles (name, organization, type, sectors, stages, ticket_min, ticket_max, geography, thesis, verified, is_demo) VALUES
('Anaya Krishnan','Northbridge Seed','Seed fund',ARRAY['EdTech','SaaS','AI'],ARRAY['MVP','Early Traction','Revenue'],50000,500000,'India','First cheques for verified student teams solving education and workflow problems.',true,true),
('Rohit Menon','Kalpavriksha Angels','Angel network',ARRAY['AgriTech','ClimateTech'],ARRAY['Prototype','MVP'],25000,150000,'India','Climate and agriculture founders with hardware in the field.',true,true),
('Priya Deshmukh','Arclight Ventures','VC',ARRAY['HealthTech','DeepTech','Robotics'],ARRAY['Revenue','Growth'],250000,2000000,'Asia','Deep technology with clinical or industrial validation.',true,true),
('Vikram Shah','Campus Capital','Angel',ARRAY['FinTech','SaaS','Consumer'],ARRAY['Idea','Prototype','MVP'],10000,100000,'India','Pre-seed cheques for student founders, decided in two weeks.',true,true);

INSERT INTO public.programs (name, cohort, seats, mentor, status, starts_on, is_demo) VALUES
('Seed Sprint','Autumn 2026',12,'Dr. Meera Joshi','running','2026-09-01',true),
('Deep Tech Residency','Autumn 2026',8,'Prof. Alok Nair','open','2026-10-05',true),
('Investor Readiness Bootcamp','Summer 2026',20,'Kavya Rao','closed','2026-05-12',true);
