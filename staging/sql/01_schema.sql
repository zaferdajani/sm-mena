-- Sawwiq staging schema. Apply to an EMPTY database (Supabase project
-- sawwiq-staging, ref klbjfgeoztmvtiolvjbk). Equivalent to running every
-- file in lib/db/migrations on an empty Postgres.
--
-- public already exists on a new database; drizzle is created here.
-- The drizzle.__drizzle_migrations rows are the hashes Drizzle records,
-- so a later `npm run db:migrate` sees nothing new and applies no SQL.
-- Service-catalog rows are data and live in the seed files.

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS drizzle;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: agency_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agency_kind AS ENUM (
    'agency',
    'freelancer'
);


--
-- Name: agency_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agency_status AS ENUM (
    'active',
    'suspended',
    'deactivated'
);


--
-- Name: billing; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing AS ENUM (
    'monthly',
    'one_off'
);


--
-- Name: change_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.change_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'withdrawn'
);


--
-- Name: contact_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_channel AS ENUM (
    'whatsapp',
    'phone',
    'email',
    'website',
    'instagram'
);


--
-- Name: contract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contract_status AS ENUM (
    'sent',
    'active',
    'completed',
    'cancelled',
    'disputed'
);


--
-- Name: conversation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.conversation_status AS ENUM (
    'open',
    'closed',
    'blocked'
);


--
-- Name: dispute_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispute_status AS ENUM (
    'open',
    'decided',
    'appealed',
    'final',
    'closed'
);


--
-- Name: error_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.error_status AS ENUM (
    'open',
    'investigating',
    'fixed',
    'wont_fix',
    'cannot_reproduce'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'profile_view',
    'post_view',
    'contact_click',
    'inquiry',
    'like',
    'save',
    'follow',
    'promotion_impression',
    'promotion_click',
    'recommended',
    'proposal',
    'ai_chat'
);


--
-- Name: inquiry_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inquiry_status AS ENUM (
    'new',
    'read',
    'archived'
);


--
-- Name: ledger_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_type AS ENUM (
    'deposit',
    'release',
    'refund',
    'fee'
);


--
-- Name: message_side; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_side AS ENUM (
    'client',
    'agency',
    'system',
    'staff'
);


--
-- Name: milestone_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_status AS ENUM (
    'pending',
    'funded',
    'submitted',
    'changes_requested',
    'approved',
    'released',
    'refunded',
    'cancelled',
    'split'
);


--
-- Name: owner_match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.owner_match_status AS ENUM (
    'suggested',
    'sent',
    'accepted',
    'declined',
    'introduced'
);


--
-- Name: partner_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.partner_request_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'cancelled'
);


--
-- Name: payment_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_kind AS ENUM (
    'subscription',
    'promotion'
);


--
-- Name: payment_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_mode AS ENUM (
    'protected',
    'direct'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
);


--
-- Name: plan_id; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_id AS ENUM (
    'free',
    'pro',
    'business'
);


--
-- Name: post_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.post_status AS ENUM (
    'published',
    'hidden'
);


--
-- Name: promotion_placement; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotion_placement AS ENUM (
    'feed',
    'strip',
    'explore'
);


--
-- Name: promotion_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotion_status AS ENUM (
    'active',
    'paused',
    'ended'
);


--
-- Name: proposal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proposal_status AS ENUM (
    'sent',
    'shortlisted',
    'accepted',
    'declined'
);


--
-- Name: prospect_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prospect_status AS ENUM (
    'new',
    'contacted',
    'replied',
    'joined',
    'declined'
);


--
-- Name: report_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_reason AS ENUM (
    'spam',
    'stolen_work',
    'misleading',
    'inappropriate',
    'other'
);


--
-- Name: report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_status AS ENUM (
    'open',
    'resolved',
    'dismissed'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: review_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_source AS ENUM (
    'invite',
    'inquiry',
    'contract'
);


--
-- Name: review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_status AS ENUM (
    'published',
    'hidden'
);


--
-- Name: service_tag_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_tag_status AS ENUM (
    'approved',
    'pending',
    'rejected'
);


--
-- Name: setup_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.setup_status AS ENUM (
    'in_progress',
    'paused',
    'finished'
);


--
-- Name: social_grant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_grant_status AS ENUM (
    'active',
    'limited',
    'expired',
    'revoked',
    'revoke_pending',
    'failed'
);


--
-- Name: social_item_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_item_state AS ENUM (
    'offered',
    'draft',
    'published',
    'dismissed'
);


--
-- Name: social_ownership; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_ownership AS ENUM (
    'own',
    'client'
);


--
-- Name: social_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_provider AS ENUM (
    'google',
    'youtube',
    'instagram',
    'facebook',
    'tiktok'
);


--
-- Name: social_resource_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_resource_status AS ENUM (
    'pending',
    'selected',
    'removed'
);


--
-- Name: support_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_kind AS ENUM (
    'bug',
    'question',
    'suggestion'
);


--
-- Name: support_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_status AS ENUM (
    'new',
    'planned',
    'done',
    'declined'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'agency',
    'admin',
    'owner',
    'backbone',
    'maintenance',
    'support',
    'client',
    'agent'
);


--
-- Name: milestone_shares_frozen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.milestone_shares_frozen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN RAISE EXCEPTION 'milestone share % is accepted and cannot be deleted', OLD.id; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'accepted' AND (
    NEW.status IS DISTINCT FROM OLD.status OR NEW.amount_fils IS DISTINCT FROM OLD.amount_fils OR NEW.kind IS DISTINCT FROM OLD.kind
    OR NEW.percent IS DISTINCT FROM OLD.percent OR NEW.partner_agency_id IS DISTINCT FROM OLD.partner_agency_id
    OR NEW.agency_id IS DISTINCT FROM OLD.agency_id OR NEW.milestone_id IS DISTINCT FROM OLD.milestone_id
    OR NEW.contract_id IS DISTINCT FROM OLD.contract_id OR NEW.terms_hash IS DISTINCT FROM OLD.terms_hash
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
  ) THEN
    RAISE EXCEPTION 'milestone share % is accepted and frozen', OLD.id;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: sawwiq_chat_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sawwiq_chat_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.created_at < now() - interval '24 months'
       OR NOT EXISTS (SELECT 1 FROM conversations c WHERE c.id = OLD.conversation_id) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'chat messages cannot be deleted';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.side IS DISTINCT FROM OLD.side
     OR NEW.sender_visitor_id IS DISTINCT FROM OLD.sender_visitor_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.ip_hash IS DISTINCT FROM OLD.ip_hash
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id AND NEW.sender_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'chat messages cannot be edited';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sawwiq_freeze_signatures(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sawwiq_freeze_signatures() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.terms_hash IS DISTINCT FROM OLD.terms_hash THEN
    RAISE EXCEPTION 'signed terms are frozen';
  END IF;
  IF NEW.agency_signer_name IS DISTINCT FROM OLD.agency_signer_name
     OR NEW.agency_signed_at IS DISTINCT FROM OLD.agency_signed_at
     OR (OLD.agency_signature IS NOT NULL AND NEW.agency_signature IS DISTINCT FROM OLD.agency_signature) THEN
    RAISE EXCEPTION 'agency signature is frozen';
  END IF;
  IF OLD.client_signed_at IS NOT NULL AND (
       NEW.client_signer_name IS DISTINCT FROM OLD.client_signer_name
       OR NEW.client_signed_at IS DISTINCT FROM OLD.client_signed_at
       OR NEW.client_signature IS DISTINCT FROM OLD.client_signature
       OR NEW.client_sign_ip_hash IS DISTINCT FROM OLD.client_sign_ip_hash) THEN
    RAISE EXCEPTION 'client signature is frozen';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sawwiq_ledger_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sawwiq_ledger_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'escrow ledger is append-only';
  END IF;
  IF NEW.contract_id IS DISTINCT FROM OLD.contract_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.amount_fils IS DISTINCT FROM OLD.amount_fils
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.idem_key IS NOT NULL AND NEW.idem_key IS DISTINCT FROM OLD.idem_key)
     OR (OLD.milestone_id IS NOT NULL AND NEW.milestone_id IS DISTINCT FROM OLD.milestone_id) THEN
    RAISE EXCEPTION 'escrow ledger entries are immutable';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: work_order_versions_frozen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.work_order_versions_frozen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- A direct delete of history is refused; a cascade from the parent work order (trigger depth > 1) is allowed.
    IF OLD.status IN ('accepted', 'superseded') AND pg_trigger_depth() <= 1 THEN RAISE EXCEPTION 'work order version % is % and cannot be deleted', OLD.id, OLD.status; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'superseded' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'work order version % is superseded history and cannot change', OLD.id;
  END IF;
  IF OLD.status = 'accepted' AND (
    NEW.deliverables IS DISTINCT FROM OLD.deliverables OR NEW.scope IS DISTINCT FROM OLD.scope OR NEW.revision_allowance IS DISTINCT FROM OLD.revision_allowance
    OR NEW.due_on IS DISTINCT FROM OLD.due_on OR NEW.review_days IS DISTINCT FROM OLD.review_days OR NEW.compensation_note IS DISTINCT FROM OLD.compensation_note
    OR NEW.permission_scope IS DISTINCT FROM OLD.permission_scope OR NEW.proposed_by IS DISTINCT FROM OLD.proposed_by OR NEW.terms_hash IS DISTINCT FROM OLD.terms_hash
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at OR NEW.work_order_id IS DISTINCT FROM OLD.work_order_id OR NEW.version IS DISTINCT FROM OLD.version
    OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'superseded')
  ) THEN
    RAISE EXCEPTION 'work order version % is accepted and frozen', OLD.id;
  END IF;
  RETURN NEW;
END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: agencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    handle text NOT NULL,
    name text NOT NULL,
    bio text DEFAULT ''::text NOT NULL,
    avatar_key text,
    country text DEFAULT 'jo'::text NOT NULL,
    city text NOT NULL,
    services text[] DEFAULT '{}'::text[] NOT NULL,
    platforms text[] DEFAULT '{}'::text[] NOT NULL,
    industries text[] DEFAULT '{}'::text[] NOT NULL,
    languages text[] DEFAULT '{ar}'::text[] NOT NULL,
    starting_price_jod integer,
    whatsapp text,
    phone text,
    email text,
    website text,
    instagram text,
    founded_year integer,
    team_size text,
    is_verified boolean DEFAULT false NOT NULL,
    is_demo boolean DEFAULT false NOT NULL,
    status public.agency_status DEFAULT 'active'::public.agency_status NOT NULL,
    plan public.plan_id DEFAULT 'free'::public.plan_id NOT NULL,
    plan_expires_at timestamp with time zone,
    follower_count integer DEFAULT 0 NOT NULL,
    post_count integer DEFAULT 0 NOT NULL,
    search_text text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rating_sum integer DEFAULT 0 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    google_place_id text,
    google_maps_url text,
    google_rating real,
    google_rating_count integer,
    google_fetched_at timestamp with time zone,
    serves_countries text[] DEFAULT '{}'::text[] NOT NULL,
    about text DEFAULT ''::text NOT NULL,
    strengths text[] DEFAULT '{}'::text[] NOT NULL,
    kind public.agency_kind DEFAULT 'agency'::public.agency_kind NOT NULL,
    pending_services integer[] DEFAULT '{}'::integer[] NOT NULL,
    team_roles text[] DEFAULT '{}'::text[] NOT NULL,
    seeks_roles text[] DEFAULT '{}'::text[] NOT NULL,
    deactivated_at timestamp with time zone,
    deactivation_reason text,
    content_lang text DEFAULT 'ar'::text NOT NULL,
    translation jsonb DEFAULT '{}'::jsonb NOT NULL,
    founding_seat integer,
    referred_by_agent_id uuid,
    referral_void_reason text,
    pioneer_number integer,
    social_links jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: availability_windows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_windows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    timezone text DEFAULT 'Asia/Amman'::text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    capacity_units integer,
    capacity_unit text,
    visibility text DEFAULT 'partners'::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    confirmed_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT availability_windows_order CHECK ((ends_at > starts_at))
);


--
-- Name: cancellation_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancellation_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    proposed_by text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    splits jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capacity_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacity_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_agency_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'tentative'::text NOT NULL,
    expires_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT capacity_reservations_order CHECK ((ends_at > starts_at))
);


--
-- Name: collab_ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_ai_usage (
    agency_id uuid NOT NULL,
    day text NOT NULL,
    used integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_blocks (
    blocker_agency_id uuid NOT NULL,
    blocked_agency_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    author_agency_id uuid NOT NULL,
    about_agency_id uuid NOT NULL,
    author_role text NOT NULL,
    communication integer NOT NULL,
    reliability integer NOT NULL,
    quality integer NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    visibility text DEFAULT 'parties'::text NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    dispute_note text,
    disputed_at timestamp with time zone,
    moderated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_agency_id uuid NOT NULL,
    token_hash text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    roles text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_agency_id uuid,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_need_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_need_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    need_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'interested'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_needs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_needs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    title text NOT NULL,
    roles text[] DEFAULT '{}'::text[] NOT NULL,
    services text[] DEFAULT '{}'::text[] NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    work_mode text DEFAULT 'remote'::text NOT NULL,
    city text,
    country text DEFAULT 'jo'::text NOT NULL,
    languages text[] DEFAULT '{}'::text[] NOT NULL,
    starts_on text,
    ends_on text,
    budget_min_fils integer,
    budget_max_fils integer,
    currency text DEFAULT 'JOD'::text NOT NULL,
    modes text[] DEFAULT '{private}'::text[] NOT NULL,
    audience text DEFAULT 'public'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    title text NOT NULL,
    brief text DEFAULT ''::text NOT NULL,
    deliverables jsonb DEFAULT '[]'::jsonb NOT NULL,
    packages jsonb DEFAULT '[]'::jsonb NOT NULL,
    sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    assistant text DEFAULT 'none'::text NOT NULL,
    assistant_requested boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    private_notes text DEFAULT ''::text NOT NULL
);


--
-- Name: collab_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_prefs (
    agency_id uuid NOT NULL,
    muted_kinds text[] DEFAULT '{}'::text[] NOT NULL,
    quiet_start integer,
    quiet_end integer,
    show_feedback boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_profiles (
    agency_id uuid NOT NULL,
    modes text[] DEFAULT '{}'::text[] NOT NULL,
    work_modes text[] DEFAULT '{}'::text[] NOT NULL,
    open_to_work boolean,
    consent_version text DEFAULT 'collab-2026-09'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collab_roster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collab_roster (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_agency_id uuid NOT NULL,
    provider_agency_id uuid NOT NULL,
    group_name text DEFAULT ''::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    rate_fils integer,
    rate_currency text,
    rate_unit text,
    last_engaged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    title text NOT NULL,
    reason text NOT NULL,
    amount_fils integer NOT NULL,
    due_date text NOT NULL,
    checks jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.change_status DEFAULT 'pending'::public.change_status NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    milestone_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_events (
    id bigint NOT NULL,
    contract_id uuid NOT NULL,
    actor text NOT NULL,
    type text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_events_id_seq OWNED BY public.contract_events.id;


--
-- Name: contract_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_agency_id uuid NOT NULL,
    to_agency_id uuid NOT NULL,
    title text NOT NULL,
    brief text DEFAULT ''::text NOT NULL,
    budget_fils integer,
    status text DEFAULT 'pending'::text NOT NULL,
    contract_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    agency_id uuid NOT NULL,
    request_id uuid,
    proposal_id uuid,
    package_id uuid,
    locale text DEFAULT 'ar'::text NOT NULL,
    title text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    special_requests jsonb DEFAULT '[]'::jsonb NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    total_fils integer NOT NULL,
    fee_percent real DEFAULT 0 NOT NULL,
    payment_mode public.payment_mode NOT NULL,
    nda boolean DEFAULT false NOT NULL,
    nda_extra text,
    status public.contract_status DEFAULT 'sent'::public.contract_status NOT NULL,
    client_name text NOT NULL,
    client_phone text NOT NULL,
    client_email text,
    client_token_hash text NOT NULL,
    client_token_enc text NOT NULL,
    terms_hash text NOT NULL,
    agency_signer_name text NOT NULL,
    agency_signed_at timestamp with time zone NOT NULL,
    client_signer_name text,
    client_signed_at timestamp with time zone,
    client_sign_ip_hash text,
    cancelled_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    terms_version integer DEFAULT 1 NOT NULL,
    kpis jsonb DEFAULT '[]'::jsonb NOT NULL,
    reporting_cadence text,
    media_budget_jod integer,
    currency text DEFAULT 'JOD'::text NOT NULL,
    jurisdiction text,
    jurisdiction_city text,
    legal_version text,
    agency_legal_name text,
    agency_reg_number text,
    client_reg_number text,
    agency_terms text,
    client_terms text,
    nda_years integer,
    agency_signature text,
    agency_sign_ip_hash text,
    client_signature text,
    review_days integer DEFAULT 7 NOT NULL,
    revision_rounds integer DEFAULT 2 NOT NULL,
    payments_live boolean DEFAULT false NOT NULL,
    client_agency_id uuid,
    client_visitor_id text,
    founder_waiver boolean DEFAULT false NOT NULL
);


--
-- Name: conversation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_messages (
    id bigint NOT NULL,
    conversation_id uuid NOT NULL,
    side public.message_side NOT NULL,
    sender_user_id uuid,
    sender_visitor_id text,
    body text NOT NULL,
    ip_hash text,
    hidden_at timestamp with time zone,
    hidden_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversation_messages_body_length CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))
);


--
-- Name: conversation_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversation_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversation_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversation_messages_id_seq OWNED BY public.conversation_messages.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    request_id uuid,
    proposal_id uuid,
    inquiry_id uuid,
    client_visitor_id text,
    client_name text NOT NULL,
    status public.conversation_status DEFAULT 'open'::public.conversation_status NOT NULL,
    notice_version text NOT NULL,
    last_message_id bigint DEFAULT 0 NOT NULL,
    last_message_at timestamp with time zone,
    agency_last_read_id bigint DEFAULT 0 NOT NULL,
    client_last_read_id bigint DEFAULT 0 NOT NULL,
    agency_emailed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dispute_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispute_evidence (
    id bigint NOT NULL,
    dispute_id uuid NOT NULL,
    side text NOT NULL,
    body text NOT NULL,
    links text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dispute_evidence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispute_evidence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispute_evidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispute_evidence_id_seq OWNED BY public.dispute_evidence.id;


--
-- Name: error_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_events (
    id bigint NOT NULL,
    fingerprint text NOT NULL,
    source text NOT NULL,
    kind text NOT NULL,
    message text NOT NULL,
    stack text,
    path text,
    user_agent text,
    occurrences integer DEFAULT 1 NOT NULL,
    status public.error_status DEFAULT 'open'::public.error_status NOT NULL,
    resolution_notes text,
    resolution_commit text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: error_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_events_id_seq OWNED BY public.error_events.id;


--
-- Name: escrow_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escrow_ledger (
    id bigint NOT NULL,
    contract_id uuid NOT NULL,
    milestone_id uuid,
    type public.ledger_type NOT NULL,
    amount_fils integer NOT NULL,
    status text DEFAULT 'succeeded'::text NOT NULL,
    provider text NOT NULL,
    provider_ref text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    idem_key text,
    test boolean GENERATED ALWAYS AS ((provider = 'mock'::text)) STORED NOT NULL,
    payee_agency_id uuid
);


--
-- Name: escrow_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.escrow_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: escrow_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.escrow_ledger_id_seq OWNED BY public.escrow_ledger.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    type public.event_type NOT NULL,
    agency_id uuid,
    post_id uuid,
    promotion_id uuid,
    channel public.contact_channel,
    visitor_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    detail text
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    agency_id uuid NOT NULL,
    visitor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: founding_seat_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.founding_seat_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    post_id uuid,
    name text NOT NULL,
    phone text NOT NULL,
    business_name text,
    service text,
    message text NOT NULL,
    visitor_id text,
    status public.inquiry_status DEFAULT 'new'::public.inquiry_status NOT NULL,
    consent_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.likes (
    post_id uuid NOT NULL,
    visitor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: milestone_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    milestone_id uuid NOT NULL,
    "position" integer NOT NULL,
    text text NOT NULL,
    source text NOT NULL,
    done_by_agency boolean DEFAULT false NOT NULL,
    confirmed_by_client boolean DEFAULT false NOT NULL
);


--
-- Name: milestone_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    milestone_id uuid NOT NULL,
    opened_by text NOT NULL,
    statement text NOT NULL,
    status public.dispute_status DEFAULT 'open'::public.dispute_status NOT NULL,
    decision text,
    release_fils integer,
    refund_fils integer,
    reason text,
    decided_by uuid,
    decided_at timestamp with time zone,
    appeal_deadline timestamp with time zone,
    agency_accepted_at timestamp with time zone,
    client_accepted_at timestamp with time zone,
    appealed_by text,
    appeal_note text,
    appealed_at timestamp with time zone,
    first_decision jsonb,
    final_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: milestone_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    milestone_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    partner_agency_id uuid NOT NULL,
    kind text NOT NULL,
    percent integer,
    amount_fils integer NOT NULL,
    note text,
    status text DEFAULT 'proposed'::text NOT NULL,
    terms_hash text,
    accepted_at timestamp with time zone,
    paid_by_agency_at timestamp with time zone,
    received_by_partner_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    "position" integer NOT NULL,
    title text NOT NULL,
    due_date text NOT NULL,
    amount_fils integer NOT NULL,
    status public.milestone_status DEFAULT 'pending'::public.milestone_status NOT NULL,
    submission_note text,
    changes_note text,
    client_paid_direct boolean DEFAULT false NOT NULL,
    agency_confirmed_paid boolean DEFAULT false NOT NULL,
    funded_at timestamp with time zone,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    released_at timestamp with time zone,
    review_due_at timestamp with time zone,
    reminders_sent integer DEFAULT 0 NOT NULL,
    change_rounds integer DEFAULT 0 NOT NULL,
    extra_rounds integer DEFAULT 0 NOT NULL,
    extra_round_asked_at timestamp with time zone,
    approved_by text
);


--
-- Name: ndas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ndas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    agency_id uuid NOT NULL,
    locale text DEFAULT 'ar'::text NOT NULL,
    direction text DEFAULT 'mutual'::text NOT NULL,
    purpose text NOT NULL,
    years integer DEFAULT 2 NOT NULL,
    jurisdiction text NOT NULL,
    jurisdiction_city text NOT NULL,
    legal_version text NOT NULL,
    agency_legal_name text NOT NULL,
    agency_reg_number text,
    agency_terms text,
    client_terms text,
    client_name text NOT NULL,
    client_phone text NOT NULL,
    client_email text,
    client_reg_number text,
    client_token_hash text NOT NULL,
    client_token_enc text NOT NULL,
    terms_hash text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    agency_signer_name text NOT NULL,
    agency_signed_at timestamp with time zone NOT NULL,
    agency_signature text NOT NULL,
    agency_sign_ip_hash text,
    client_signer_name text,
    client_signed_at timestamp with time zone,
    client_signature text,
    client_sign_ip_hash text,
    client_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    agency_id uuid,
    visitor_id text,
    request_id uuid,
    conversation_id uuid,
    kind text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    href text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: owner_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owner_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    score integer NOT NULL,
    reasons jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.owner_match_status DEFAULT 'suggested'::public.owner_match_status NOT NULL,
    batch_id text NOT NULL,
    sent_at timestamp with time zone,
    responded_at timestamp with time zone,
    introduced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: owner_needs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owner_needs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    country text NOT NULL,
    city text NOT NULL,
    business_type text,
    services jsonb DEFAULT '[]'::jsonb NOT NULL,
    timing text NOT NULL,
    whatsapp text,
    note text,
    locale text DEFAULT 'ar'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    service text NOT NULL,
    price_jod integer NOT NULL,
    billing public.billing DEFAULT 'monthly'::public.billing NOT NULL,
    deliverables text[] DEFAULT '{}'::text[] NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    delivery_days integer,
    translation jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_views (
    id bigint NOT NULL,
    path text NOT NULL,
    source text NOT NULL,
    visitor_id text,
    session_id text NOT NULL,
    landing boolean DEFAULT false NOT NULL,
    device text NOT NULL,
    locale text,
    timezone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.page_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: page_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.page_views_id_seq OWNED BY public.page_views.id;


--
-- Name: partner_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_agency_id uuid NOT NULL,
    to_agency_id uuid NOT NULL,
    roles text[] DEFAULT '{}'::text[] NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    status public.partner_request_status DEFAULT 'pending'::public.partner_request_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone
);


--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_events (
    id bigint NOT NULL,
    provider text NOT NULL,
    event_id text NOT NULL,
    payment_id uuid,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_events_id_seq OWNED BY public.payment_events.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid,
    agency_name text NOT NULL,
    kind public.payment_kind NOT NULL,
    plan public.plan_id,
    months integer,
    promotion_id uuid,
    amount_fils integer NOT NULL,
    currency text DEFAULT 'JOD'::text NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    provider text NOT NULL,
    method text NOT NULL,
    provider_ref text,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    paid_at timestamp with time zone,
    refunded_at timestamp with time zone,
    refund_reason text,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pioneer_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pioneer_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    number integer,
    name text NOT NULL,
    prospect_id uuid,
    expires_at timestamp with time zone NOT NULL,
    scans integer DEFAULT 0 NOT NULL,
    last_scan_at timestamp with time zone,
    watched_at timestamp with time zone,
    claimed_agency_id uuid,
    claimed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    qa boolean DEFAULT false NOT NULL
);


--
-- Name: portfolio_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    name text NOT NULL,
    industry text,
    country text,
    description text DEFAULT ''::text NOT NULL,
    links jsonb DEFAULT '[]'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    translation jsonb DEFAULT '{}'::jsonb NOT NULL,
    logo_key text,
    confirm_token text,
    confirmed_at timestamp with time zone
);


--
-- Name: portfolio_setup_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_setup_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    key text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_setups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_setups (
    agency_id uuid NOT NULL,
    user_id uuid,
    status public.setup_status DEFAULT 'in_progress'::public.setup_status NOT NULL,
    step integer DEFAULT 1 NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    post_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    "position" integer NOT NULL,
    key text NOT NULL,
    thumb_key text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    color text DEFAULT '#e5e7eb'::text NOT NULL,
    alt text DEFAULT ''::text NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    caption text DEFAULT ''::text NOT NULL,
    services text[] DEFAULT '{}'::text[] NOT NULL,
    platforms text[] DEFAULT '{}'::text[] NOT NULL,
    industry text,
    result text,
    status public.post_status DEFAULT 'published'::public.post_status NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    save_count integer DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    search_text text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    pinned_at timestamp with time zone,
    client_id uuid,
    translation jsonb DEFAULT '{}'::jsonb NOT NULL,
    app jsonb,
    source_url text,
    source_provider text,
    source_item_id text,
    embed jsonb
);


--
-- Name: profile_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_publications (
    agency_id uuid NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    consent_version text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profile_publications_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text])))
);


--
-- Name: project_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    client_name text NOT NULL,
    phone text NOT NULL,
    business_name text,
    business_type text,
    services text[] DEFAULT '{}'::text[] NOT NULL,
    platforms text[] DEFAULT '{}'::text[] NOT NULL,
    city text,
    budget_min_jod integer,
    budget_max_jod integer,
    timeline text,
    description text NOT NULL,
    source text DEFAULT 'form'::text NOT NULL,
    status public.request_status DEFAULT 'open'::public.request_status NOT NULL,
    visitor_id text,
    consent_version text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_service boolean DEFAULT false NOT NULL,
    brands text,
    country text DEFAULT 'jo'::text NOT NULL
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    post_id uuid,
    placement public.promotion_placement NOT NULL,
    service text,
    city text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status public.promotion_status DEFAULT 'active'::public.promotion_status NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    price_jod integer NOT NULL,
    billing public.billing DEFAULT 'monthly'::public.billing NOT NULL,
    timeline text NOT NULL,
    message text NOT NULL,
    status public.proposal_status DEFAULT 'sent'::public.proposal_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prospects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_key text NOT NULL,
    website text,
    instagram text,
    city text DEFAULT 'amman'::text NOT NULL,
    country text DEFAULT 'JO'::text NOT NULL,
    services text[] DEFAULT '{}'::text[] NOT NULL,
    note text,
    source text DEFAULT 'owner'::text NOT NULL,
    status public.prospect_status DEFAULT 'new'::public.prospect_status NOT NULL,
    priority boolean DEFAULT false NOT NULL,
    contacted_at timestamp with time zone,
    agency_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    phone text,
    rate_fils integer DEFAULT 5000 NOT NULL,
    currency text DEFAULT 'JOD'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    amount_fils integer NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    agency_id uuid,
    reason public.report_reason NOT NULL,
    details text DEFAULT ''::text NOT NULL,
    visitor_id text,
    status public.report_status DEFAULT 'open'::public.report_status NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: request_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_matches (
    request_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    score integer NOT NULL,
    invited boolean DEFAULT false NOT NULL,
    viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: review_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    token_hash text NOT NULL,
    client_name text DEFAULT ''::text NOT NULL,
    used_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    contract_id uuid,
    token_enc text
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    request_id uuid,
    source public.review_source NOT NULL,
    rating integer NOT NULL,
    quality integer,
    communication integer,
    value integer,
    timeliness integer,
    body text NOT NULL,
    reviewer_name text NOT NULL,
    reviewer_business text,
    service text,
    visitor_id text,
    status public.review_status DEFAULT 'published'::public.review_status NOT NULL,
    reply text,
    replied_at timestamp with time zone,
    consent_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    results integer,
    contract_id uuid
);


--
-- Name: saves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saves (
    post_id uuid NOT NULL,
    visitor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_tags (
    id integer NOT NULL,
    key text NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    "group" text DEFAULT 'other'::text NOT NULL,
    parent text,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    roles text[] DEFAULT '{}'::text[] NOT NULL,
    status public.service_tag_status DEFAULT 'pending'::public.service_tag_status NOT NULL,
    builtin boolean DEFAULT false NOT NULL,
    proposed_text text,
    proposed_by_agency_id uuid,
    merged_into_id integer,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    search_text text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_tags_id_seq OWNED BY public.service_tags.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    mfa_pending boolean DEFAULT false NOT NULL
);


--
-- Name: site_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_checks (
    id bigint NOT NULL,
    ran_at timestamp with time zone DEFAULT now() NOT NULL,
    ok boolean NOT NULL,
    failures integer DEFAULT 0 NOT NULL,
    closed integer DEFAULT 0 NOT NULL,
    results jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: site_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.site_checks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: site_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.site_checks_id_seq OWNED BY public.site_checks.id;


--
-- Name: social_deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_deletion_requests (
    code text NOT NULL,
    provider public.social_provider NOT NULL,
    grants integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    user_id uuid,
    provider public.social_provider NOT NULL,
    provider_subject text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    sealed_access text,
    sealed_refresh text,
    key_version integer DEFAULT 1 NOT NULL,
    access_expires_at timestamp with time zone,
    refresh_expires_at timestamp with time zone,
    status public.social_grant_status DEFAULT 'active'::public.social_grant_status NOT NULL,
    status_reason text,
    consent_version text NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    last_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_import_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_import_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agency_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    provider public.social_provider NOT NULL,
    provider_item_id text NOT NULL,
    media_kind text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    caption text DEFAULT ''::text NOT NULL,
    permalink text NOT NULL,
    thumbnail_url text,
    published_at timestamp with time zone,
    state public.social_item_state DEFAULT 'offered'::public.social_item_state NOT NULL,
    post_id uuid,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_oauth_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_oauth_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_hash text NOT NULL,
    provider public.social_provider NOT NULL,
    user_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    session_hash text NOT NULL,
    ownership public.social_ownership NOT NULL,
    client_id uuid,
    locale text NOT NULL,
    return_to text DEFAULT 'connections'::text NOT NULL,
    sealed_verifier text,
    sealed_nonce text,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_quota_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_quota_usage (
    provider public.social_provider NOT NULL,
    day text NOT NULL,
    units integer DEFAULT 0 NOT NULL
);


--
-- Name: social_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grant_id uuid NOT NULL,
    agency_id uuid NOT NULL,
    provider public.social_provider NOT NULL,
    kind text NOT NULL,
    provider_resource_id text NOT NULL,
    display_name text NOT NULL,
    handle text,
    ownership public.social_ownership NOT NULL,
    client_id uuid,
    status public.social_resource_status DEFAULT 'pending'::public.social_resource_status NOT NULL,
    sealed_token text,
    pending_expires_at timestamp with time zone,
    selected_at timestamp with time zone,
    metadata_fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role public.user_role NOT NULL,
    token_hash text NOT NULL,
    access_until timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_by uuid NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.support_kind NOT NULL,
    message text NOT NULL,
    email text,
    path text,
    locale text,
    user_agent text,
    user_id uuid,
    visitor_id text,
    status public.support_status DEFAULT 'new'::public.support_status NOT NULL,
    admin_note text,
    handled_by uuid,
    handled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public.user_role DEFAULT 'agency'::public.user_role NOT NULL,
    consent_version text NOT NULL,
    consent_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    totp_secret_enc text,
    totp_pending_enc text,
    totp_enabled_at timestamp with time zone,
    totp_last_step integer DEFAULT 0 NOT NULL,
    backup_code_hashes jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_login_at timestamp with time zone,
    staff_expires_at timestamp with time zone,
    disabled_at timestamp with time zone,
    invited_by uuid
);


--
-- Name: work_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_agency_id uuid NOT NULL,
    need_id uuid,
    parent_contract_id uuid,
    title text NOT NULL,
    role text DEFAULT ''::text NOT NULL,
    deliverables jsonb DEFAULT '[]'::jsonb NOT NULL,
    assets_note text DEFAULT ''::text NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    starts_on text,
    due_on text,
    timezone text DEFAULT 'Asia/Amman'::text NOT NULL,
    work_mode text DEFAULT 'remote'::text NOT NULL,
    city text,
    country text DEFAULT 'jo'::text NOT NULL,
    budget_fils integer,
    currency text DEFAULT 'JOD'::text NOT NULL,
    privacy_mode text DEFAULT 'private'::text NOT NULL,
    response_by timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    accepted_quote_id uuid,
    contract_request_id uuid,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_inquiry_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_inquiry_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    supplier_agency_id uuid NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_order_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    group_id uuid DEFAULT gen_random_uuid() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    uploaded_by_agency_id uuid NOT NULL,
    name text NOT NULL,
    storage_key text NOT NULL,
    thumb_key text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    bytes integer NOT NULL,
    status text DEFAULT 'current'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_order_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    author_agency_id uuid NOT NULL,
    body text NOT NULL,
    x real,
    y real,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_order_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    author_agency_id uuid NOT NULL,
    scope text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_order_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    round integer NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decision text,
    decision_note text,
    decided_at timestamp with time zone,
    contract_effect text
);


--
-- Name: work_order_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    version integer NOT NULL,
    deliverables jsonb DEFAULT '[]'::jsonb NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    revision_allowance integer DEFAULT 2 NOT NULL,
    due_on text,
    review_days integer DEFAULT 7 NOT NULL,
    compensation_note text DEFAULT ''::text NOT NULL,
    permission_scope text DEFAULT ''::text NOT NULL,
    proposed_by text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    accepted_at timestamp with time zone,
    terms_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_agency_id uuid NOT NULL,
    supplier_agency_id uuid NOT NULL,
    inquiry_id uuid,
    contract_id uuid,
    milestone_id uuid,
    parent_contract_id uuid,
    mode text DEFAULT 'private'::text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    current_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    supplier_agency_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    amount_fils integer NOT NULL,
    currency text DEFAULT 'JOD'::text NOT NULL,
    starts_on text,
    due_on text,
    scope_note text DEFAULT ''::text NOT NULL,
    exclusions text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: contract_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_events ALTER COLUMN id SET DEFAULT nextval('public.contract_events_id_seq'::regclass);


--
-- Name: conversation_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages ALTER COLUMN id SET DEFAULT nextval('public.conversation_messages_id_seq'::regclass);


--
-- Name: dispute_evidence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispute_evidence ALTER COLUMN id SET DEFAULT nextval('public.dispute_evidence_id_seq'::regclass);


--
-- Name: error_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_events ALTER COLUMN id SET DEFAULT nextval('public.error_events_id_seq'::regclass);


--
-- Name: escrow_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger ALTER COLUMN id SET DEFAULT nextval('public.escrow_ledger_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: page_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views ALTER COLUMN id SET DEFAULT nextval('public.page_views_id_seq'::regclass);


--
-- Name: payment_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events ALTER COLUMN id SET DEFAULT nextval('public.payment_events_id_seq'::regclass);


--
-- Name: service_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags ALTER COLUMN id SET DEFAULT nextval('public.service_tags_id_seq'::regclass);


--
-- Name: site_checks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_checks ALTER COLUMN id SET DEFAULT nextval('public.site_checks_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: agencies agencies_founding_seat_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_founding_seat_unique UNIQUE (founding_seat);


--
-- Name: agencies agencies_handle_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_handle_unique UNIQUE (handle);


--
-- Name: agencies agencies_owner_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_owner_user_id_unique UNIQUE (owner_user_id);


--
-- Name: agencies agencies_pioneer_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pioneer_number_unique UNIQUE (pioneer_number);


--
-- Name: agencies agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: availability_windows availability_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_windows
    ADD CONSTRAINT availability_windows_pkey PRIMARY KEY (id);


--
-- Name: cancellation_proposals cancellation_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_proposals
    ADD CONSTRAINT cancellation_proposals_pkey PRIMARY KEY (id);


--
-- Name: capacity_reservations capacity_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_reservations
    ADD CONSTRAINT capacity_reservations_pkey PRIMARY KEY (id);


--
-- Name: collab_ai_usage collab_ai_usage_agency_id_day_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_ai_usage
    ADD CONSTRAINT collab_ai_usage_agency_id_day_pk PRIMARY KEY (agency_id, day);


--
-- Name: collab_blocks collab_blocks_blocker_agency_id_blocked_agency_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_blocks
    ADD CONSTRAINT collab_blocks_blocker_agency_id_blocked_agency_id_pk PRIMARY KEY (blocker_agency_id, blocked_agency_id);


--
-- Name: collab_feedback collab_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_feedback
    ADD CONSTRAINT collab_feedback_pkey PRIMARY KEY (id);


--
-- Name: collab_invites collab_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_invites
    ADD CONSTRAINT collab_invites_pkey PRIMARY KEY (id);


--
-- Name: collab_invites collab_invites_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_invites
    ADD CONSTRAINT collab_invites_token_hash_unique UNIQUE (token_hash);


--
-- Name: collab_need_replies collab_need_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_need_replies
    ADD CONSTRAINT collab_need_replies_pkey PRIMARY KEY (id);


--
-- Name: collab_needs collab_needs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_needs
    ADD CONSTRAINT collab_needs_pkey PRIMARY KEY (id);


--
-- Name: collab_plans collab_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_plans
    ADD CONSTRAINT collab_plans_pkey PRIMARY KEY (id);


--
-- Name: collab_prefs collab_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_prefs
    ADD CONSTRAINT collab_prefs_pkey PRIMARY KEY (agency_id);


--
-- Name: collab_profiles collab_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_profiles
    ADD CONSTRAINT collab_profiles_pkey PRIMARY KEY (agency_id);


--
-- Name: collab_roster collab_roster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_roster
    ADD CONSTRAINT collab_roster_pkey PRIMARY KEY (id);


--
-- Name: contract_changes contract_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_changes
    ADD CONSTRAINT contract_changes_pkey PRIMARY KEY (id);


--
-- Name: contract_events contract_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_events
    ADD CONSTRAINT contract_events_pkey PRIMARY KEY (id);


--
-- Name: contract_requests contract_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_requests
    ADD CONSTRAINT contract_requests_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_client_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_client_token_hash_unique UNIQUE (client_token_hash);


--
-- Name: contracts contracts_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_number_unique UNIQUE (number);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: conversation_messages conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: dispute_evidence dispute_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispute_evidence
    ADD CONSTRAINT dispute_evidence_pkey PRIMARY KEY (id);


--
-- Name: error_events error_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_events
    ADD CONSTRAINT error_events_pkey PRIMARY KEY (id);


--
-- Name: escrow_ledger escrow_ledger_idem_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_idem_key_unique UNIQUE (idem_key);


--
-- Name: escrow_ledger escrow_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: follows follows_agency_id_visitor_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_agency_id_visitor_id_pk PRIMARY KEY (agency_id, visitor_id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: likes likes_post_id_visitor_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_post_id_visitor_id_pk PRIMARY KEY (post_id, visitor_id);


--
-- Name: login_codes login_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_codes
    ADD CONSTRAINT login_codes_pkey PRIMARY KEY (id);


--
-- Name: milestone_checks milestone_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_checks
    ADD CONSTRAINT milestone_checks_pkey PRIMARY KEY (id);


--
-- Name: milestone_disputes milestone_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_pkey PRIMARY KEY (id);


--
-- Name: milestone_shares milestone_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_shares
    ADD CONSTRAINT milestone_shares_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: ndas ndas_client_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndas
    ADD CONSTRAINT ndas_client_token_hash_unique UNIQUE (client_token_hash);


--
-- Name: ndas ndas_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndas
    ADD CONSTRAINT ndas_number_unique UNIQUE (number);


--
-- Name: ndas ndas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndas
    ADD CONSTRAINT ndas_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: owner_matches owner_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_matches
    ADD CONSTRAINT owner_matches_pkey PRIMARY KEY (id);


--
-- Name: owner_needs owner_needs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_needs
    ADD CONSTRAINT owner_needs_pkey PRIMARY KEY (id);


--
-- Name: owner_needs owner_needs_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_needs
    ADD CONSTRAINT owner_needs_user_id_unique UNIQUE (user_id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);


--
-- Name: partner_requests partner_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_requests
    ADD CONSTRAINT partner_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pioneer_invitations pioneer_invitations_claimed_agency_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_claimed_agency_id_unique UNIQUE (claimed_agency_id);


--
-- Name: pioneer_invitations pioneer_invitations_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_code_unique UNIQUE (code);


--
-- Name: pioneer_invitations pioneer_invitations_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_number_unique UNIQUE (number);


--
-- Name: pioneer_invitations pioneer_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_pkey PRIMARY KEY (id);


--
-- Name: portfolio_clients portfolio_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_clients
    ADD CONSTRAINT portfolio_clients_pkey PRIMARY KEY (id);


--
-- Name: portfolio_setup_media portfolio_setup_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_setup_media
    ADD CONSTRAINT portfolio_setup_media_pkey PRIMARY KEY (id);


--
-- Name: portfolio_setups portfolio_setups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_setups
    ADD CONSTRAINT portfolio_setups_pkey PRIMARY KEY (agency_id);


--
-- Name: post_images post_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profile_publications profile_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_publications
    ADD CONSTRAINT profile_publications_pkey PRIMARY KEY (agency_id);


--
-- Name: project_requests project_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_pkey PRIMARY KEY (id);


--
-- Name: project_requests project_requests_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_token_hash_unique UNIQUE (token_hash);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


--
-- Name: prospects prospects_name_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_name_key_unique UNIQUE (name_key);


--
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (id);


--
-- Name: referral_agents referral_agents_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_agents
    ADD CONSTRAINT referral_agents_code_unique UNIQUE (code);


--
-- Name: referral_agents referral_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_agents
    ADD CONSTRAINT referral_agents_pkey PRIMARY KEY (id);


--
-- Name: referral_agents referral_agents_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_agents
    ADD CONSTRAINT referral_agents_user_id_unique UNIQUE (user_id);


--
-- Name: referral_payouts referral_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_payouts
    ADD CONSTRAINT referral_payouts_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: request_matches request_matches_request_id_agency_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_matches
    ADD CONSTRAINT request_matches_request_id_agency_id_pk PRIMARY KEY (request_id, agency_id);


--
-- Name: review_requests review_requests_contract_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_contract_id_unique UNIQUE (contract_id);


--
-- Name: review_requests review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_pkey PRIMARY KEY (id);


--
-- Name: review_requests review_requests_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_token_hash_unique UNIQUE (token_hash);


--
-- Name: reviews reviews_contract_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_contract_id_unique UNIQUE (contract_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_request_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_request_id_unique UNIQUE (request_id);


--
-- Name: saves saves_post_id_visitor_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saves
    ADD CONSTRAINT saves_post_id_visitor_id_pk PRIMARY KEY (post_id, visitor_id);


--
-- Name: service_tags service_tags_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags
    ADD CONSTRAINT service_tags_key_unique UNIQUE (key);


--
-- Name: service_tags service_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags
    ADD CONSTRAINT service_tags_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: site_checks site_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_checks
    ADD CONSTRAINT site_checks_pkey PRIMARY KEY (id);


--
-- Name: social_deletion_requests social_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_deletion_requests
    ADD CONSTRAINT social_deletion_requests_pkey PRIMARY KEY (code);


--
-- Name: social_grants social_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_grants
    ADD CONSTRAINT social_grants_pkey PRIMARY KEY (id);


--
-- Name: social_import_items social_import_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_import_items
    ADD CONSTRAINT social_import_items_pkey PRIMARY KEY (id);


--
-- Name: social_oauth_attempts social_oauth_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_oauth_attempts
    ADD CONSTRAINT social_oauth_attempts_pkey PRIMARY KEY (id);


--
-- Name: social_quota_usage social_quota_usage_provider_day_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_quota_usage
    ADD CONSTRAINT social_quota_usage_provider_day_pk PRIMARY KEY (provider, day);


--
-- Name: social_resources social_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_resources
    ADD CONSTRAINT social_resources_pkey PRIMARY KEY (id);


--
-- Name: staff_invites staff_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invites
    ADD CONSTRAINT staff_invites_pkey PRIMARY KEY (id);


--
-- Name: staff_invites staff_invites_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invites
    ADD CONSTRAINT staff_invites_token_hash_unique UNIQUE (token_hash);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_inquiries work_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiries
    ADD CONSTRAINT work_inquiries_pkey PRIMARY KEY (id);


--
-- Name: work_inquiry_recipients work_inquiry_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiry_recipients
    ADD CONSTRAINT work_inquiry_recipients_pkey PRIMARY KEY (id);


--
-- Name: work_order_assets work_order_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_assets
    ADD CONSTRAINT work_order_assets_pkey PRIMARY KEY (id);


--
-- Name: work_order_comments work_order_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_comments
    ADD CONSTRAINT work_order_comments_pkey PRIMARY KEY (id);


--
-- Name: work_order_messages work_order_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_messages
    ADD CONSTRAINT work_order_messages_pkey PRIMARY KEY (id);


--
-- Name: work_order_submissions work_order_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_submissions
    ADD CONSTRAINT work_order_submissions_pkey PRIMARY KEY (id);


--
-- Name: work_order_versions work_order_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_versions
    ADD CONSTRAINT work_order_versions_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: work_quotes work_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_quotes
    ADD CONSTRAINT work_quotes_pkey PRIMARY KEY (id);


--
-- Name: agencies_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agencies_city_idx ON public.agencies USING btree (city);


--
-- Name: agencies_services_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agencies_services_idx ON public.agencies USING gin (services);


--
-- Name: agencies_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agencies_status_idx ON public.agencies USING btree (status);


--
-- Name: availability_windows_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_windows_agency_idx ON public.availability_windows USING btree (agency_id, starts_at);


--
-- Name: cancellation_proposals_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancellation_proposals_idx ON public.cancellation_proposals USING btree (contract_id, created_at);


--
-- Name: cancellation_proposals_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cancellation_proposals_pending_idx ON public.cancellation_proposals USING btree (contract_id) WHERE (status = 'pending'::text);


--
-- Name: capacity_reservations_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX capacity_reservations_live_idx ON public.capacity_reservations USING btree (work_order_id) WHERE (status = ANY (ARRAY['tentative'::text, 'confirmed'::text]));


--
-- Name: capacity_reservations_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX capacity_reservations_provider_idx ON public.capacity_reservations USING btree (provider_agency_id, status, starts_at);


--
-- Name: collab_blocks_blocked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_blocks_blocked_idx ON public.collab_blocks USING btree (blocked_agency_id);


--
-- Name: collab_feedback_about_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_feedback_about_idx ON public.collab_feedback USING btree (about_agency_id, status, created_at);


--
-- Name: collab_feedback_once_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX collab_feedback_once_idx ON public.collab_feedback USING btree (work_order_id, author_agency_id);


--
-- Name: collab_invites_from_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_invites_from_idx ON public.collab_invites USING btree (from_agency_id, status);


--
-- Name: collab_need_replies_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_need_replies_agency_idx ON public.collab_need_replies USING btree (agency_id);


--
-- Name: collab_need_replies_pair_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX collab_need_replies_pair_idx ON public.collab_need_replies USING btree (need_id, agency_id);


--
-- Name: collab_needs_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_needs_agency_idx ON public.collab_needs USING btree (agency_id, status);


--
-- Name: collab_needs_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_needs_open_idx ON public.collab_needs USING btree (status, country, expires_at);


--
-- Name: collab_plans_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_plans_agency_idx ON public.collab_plans USING btree (agency_id, created_at);


--
-- Name: collab_roster_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collab_roster_owner_idx ON public.collab_roster USING btree (owner_agency_id, group_name);


--
-- Name: collab_roster_pair_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX collab_roster_pair_idx ON public.collab_roster USING btree (owner_agency_id, provider_agency_id);


--
-- Name: contract_changes_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_changes_idx ON public.contract_changes USING btree (contract_id, created_at);


--
-- Name: contract_events_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_events_idx ON public.contract_events USING btree (contract_id, created_at);


--
-- Name: contract_requests_from_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_requests_from_idx ON public.contract_requests USING btree (from_agency_id, status);


--
-- Name: contract_requests_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_requests_to_idx ON public.contract_requests USING btree (to_agency_id, status);


--
-- Name: contracts_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_agency_idx ON public.contracts USING btree (agency_id, created_at);


--
-- Name: contracts_client_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_client_agency_idx ON public.contracts USING btree (client_agency_id);


--
-- Name: contracts_founder_waiver_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contracts_founder_waiver_idx ON public.contracts USING btree (agency_id) WHERE (founder_waiver AND (status <> 'cancelled'::public.contract_status));


--
-- Name: contracts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contracts_status_idx ON public.contracts USING btree (status);


--
-- Name: conversation_messages_conversation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversation_messages_conversation_idx ON public.conversation_messages USING btree (conversation_id, id);


--
-- Name: conversations_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_agency_idx ON public.conversations USING btree (agency_id, last_message_at);


--
-- Name: conversations_inquiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX conversations_inquiry_idx ON public.conversations USING btree (inquiry_id) WHERE (inquiry_id IS NOT NULL);


--
-- Name: conversations_request_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX conversations_request_agency_idx ON public.conversations USING btree (request_id, agency_id) WHERE (request_id IS NOT NULL);


--
-- Name: conversations_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_visitor_idx ON public.conversations USING btree (client_visitor_id, last_message_at);


--
-- Name: dispute_evidence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dispute_evidence_idx ON public.dispute_evidence USING btree (dispute_id, created_at);


--
-- Name: error_events_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX error_events_fingerprint ON public.error_events USING btree (fingerprint);


--
-- Name: error_events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX error_events_status_idx ON public.error_events USING btree (status, last_seen_at);


--
-- Name: escrow_contract_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX escrow_contract_idx ON public.escrow_ledger USING btree (contract_id);


--
-- Name: escrow_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX escrow_type_idx ON public.escrow_ledger USING btree (type, created_at);


--
-- Name: events_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_agency_idx ON public.events USING btree (agency_id, type, created_at);


--
-- Name: events_dedupe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_dedupe_idx ON public.events USING btree (visitor_id, type, post_id, created_at);


--
-- Name: events_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_type_idx ON public.events USING btree (type, created_at);


--
-- Name: follows_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX follows_visitor_idx ON public.follows USING btree (visitor_id, created_at);


--
-- Name: inquiries_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inquiries_agency_idx ON public.inquiries USING btree (agency_id, created_at);


--
-- Name: login_codes_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_codes_email_idx ON public.login_codes USING btree (email, created_at);


--
-- Name: milestone_checks_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestone_checks_idx ON public.milestone_checks USING btree (milestone_id, "position");


--
-- Name: milestone_disputes_contract_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestone_disputes_contract_idx ON public.milestone_disputes USING btree (contract_id, created_at);


--
-- Name: milestone_disputes_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX milestone_disputes_open_idx ON public.milestone_disputes USING btree (milestone_id) WHERE (status = ANY (ARRAY['open'::public.dispute_status, 'decided'::public.dispute_status, 'appealed'::public.dispute_status]));


--
-- Name: milestone_disputes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestone_disputes_status_idx ON public.milestone_disputes USING btree (status, appeal_deadline);


--
-- Name: milestone_shares_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX milestone_shares_live_idx ON public.milestone_shares USING btree (milestone_id) WHERE (status = ANY (ARRAY['proposed'::text, 'accepted'::text]));


--
-- Name: milestone_shares_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestone_shares_partner_idx ON public.milestone_shares USING btree (partner_agency_id, status);


--
-- Name: milestones_contract_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestones_contract_idx ON public.milestones USING btree (contract_id, "position");


--
-- Name: milestones_review_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestones_review_due_idx ON public.milestones USING btree (status, review_due_at);


--
-- Name: ndas_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ndas_agency_idx ON public.ndas USING btree (agency_id, created_at);


--
-- Name: notifications_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_agency_idx ON public.notifications USING btree (agency_id, read_at, created_at);


--
-- Name: notifications_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_visitor_idx ON public.notifications USING btree (visitor_id, read_at, created_at);


--
-- Name: owner_matches_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX owner_matches_agency_idx ON public.owner_matches USING btree (agency_id, status);


--
-- Name: owner_matches_pair_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX owner_matches_pair_idx ON public.owner_matches USING btree (owner_user_id, agency_id);


--
-- Name: owner_needs_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX owner_needs_country_idx ON public.owner_needs USING btree (country, created_at);


--
-- Name: packages_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX packages_agency_idx ON public.packages USING btree (agency_id, "position");


--
-- Name: packages_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX packages_service_idx ON public.packages USING btree (service, price_jod);


--
-- Name: page_views_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_views_created_idx ON public.page_views USING btree (created_at);


--
-- Name: page_views_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_views_session_idx ON public.page_views USING btree (session_id);


--
-- Name: partner_requests_from_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_requests_from_idx ON public.partner_requests USING btree (from_agency_id, status);


--
-- Name: partner_requests_open_pair_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_requests_open_pair_idx ON public.partner_requests USING btree (from_agency_id, to_agency_id) WHERE (status = 'pending'::public.partner_request_status);


--
-- Name: partner_requests_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_requests_to_idx ON public.partner_requests USING btree (to_agency_id, status);


--
-- Name: payment_events_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_events_unique ON public.payment_events USING btree (provider, event_id);


--
-- Name: payments_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_agency_idx ON public.payments USING btree (agency_id);


--
-- Name: payments_paid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_paid_idx ON public.payments USING btree (paid_at);


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status, created_at);


--
-- Name: pioneer_invitations_prospect_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pioneer_invitations_prospect_idx ON public.pioneer_invitations USING btree (prospect_id);


--
-- Name: portfolio_clients_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portfolio_clients_agency_idx ON public.portfolio_clients USING btree (agency_id, "position");


--
-- Name: portfolio_clients_confirm_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portfolio_clients_confirm_token_idx ON public.portfolio_clients USING btree (confirm_token);


--
-- Name: post_images_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX post_images_order_idx ON public.post_images USING btree (post_id, "position");


--
-- Name: posts_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_agency_idx ON public.posts USING btree (agency_id, created_at);


--
-- Name: posts_feed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_feed_idx ON public.posts USING btree (status, created_at, id);


--
-- Name: posts_platforms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_platforms_idx ON public.posts USING gin (platforms);


--
-- Name: posts_services_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_services_idx ON public.posts USING gin (services);


--
-- Name: posts_source_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX posts_source_item_idx ON public.posts USING btree (agency_id, source_provider, source_item_id) WHERE (source_item_id IS NOT NULL);


--
-- Name: profile_publications_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_publications_visibility_idx ON public.profile_publications USING btree (visibility);


--
-- Name: project_requests_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_requests_open_idx ON public.project_requests USING btree (status, created_at);


--
-- Name: project_requests_services_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_requests_services_idx ON public.project_requests USING gin (services);


--
-- Name: promotions_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_active_idx ON public.promotions USING btree (placement, status, starts_at, ends_at);


--
-- Name: proposals_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposals_agency_idx ON public.proposals USING btree (agency_id, created_at);


--
-- Name: proposals_request_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX proposals_request_agency_idx ON public.proposals USING btree (request_id, agency_id);


--
-- Name: prospects_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prospects_status_idx ON public.prospects USING btree (status);


--
-- Name: referral_payouts_agent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_payouts_agent_idx ON public.referral_payouts USING btree (agent_id, created_at);


--
-- Name: reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_status_idx ON public.reports USING btree (status, created_at);


--
-- Name: request_matches_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_matches_agency_idx ON public.request_matches USING btree (agency_id, created_at);


--
-- Name: review_requests_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_requests_agency_idx ON public.review_requests USING btree (agency_id, created_at);


--
-- Name: reviews_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_agency_idx ON public.reviews USING btree (agency_id, status, created_at);


--
-- Name: reviews_visitor_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reviews_visitor_agency_idx ON public.reviews USING btree (agency_id, visitor_id);


--
-- Name: saves_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saves_visitor_idx ON public.saves USING btree (visitor_id, created_at);


--
-- Name: service_tags_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_tags_status_idx ON public.service_tags USING btree (status);


--
-- Name: sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);


--
-- Name: setup_media_agency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX setup_media_agency_idx ON public.portfolio_setup_media USING btree (agency_id, "position");


--
-- Name: site_checks_ran_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX site_checks_ran_idx ON public.site_checks USING btree (ran_at);


--
-- Name: social_attempts_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_attempts_expires_idx ON public.social_oauth_attempts USING btree (expires_at);


--
-- Name: social_attempts_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX social_attempts_state_idx ON public.social_oauth_attempts USING btree (state_hash);


--
-- Name: social_grants_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX social_grants_subject_idx ON public.social_grants USING btree (agency_id, provider, provider_subject);


--
-- Name: social_items_fetched_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_items_fetched_idx ON public.social_import_items USING btree (fetched_at);


--
-- Name: social_items_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX social_items_provider_idx ON public.social_import_items USING btree (agency_id, provider, provider_item_id);


--
-- Name: social_resources_grant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_resources_grant_idx ON public.social_resources USING btree (grant_id);


--
-- Name: social_resources_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX social_resources_provider_idx ON public.social_resources USING btree (agency_id, provider, provider_resource_id);


--
-- Name: staff_invites_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_invites_email_idx ON public.staff_invites USING btree (email);


--
-- Name: support_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_status_idx ON public.support_requests USING btree (status, created_at);


--
-- Name: work_inquiries_buyer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_inquiries_buyer_idx ON public.work_inquiries USING btree (buyer_agency_id, status);


--
-- Name: work_inquiries_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_inquiries_open_idx ON public.work_inquiries USING btree (status, response_by);


--
-- Name: work_inquiry_recipients_pair_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX work_inquiry_recipients_pair_idx ON public.work_inquiry_recipients USING btree (inquiry_id, supplier_agency_id);


--
-- Name: work_inquiry_recipients_supplier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_inquiry_recipients_supplier_idx ON public.work_inquiry_recipients USING btree (supplier_agency_id, status);


--
-- Name: work_order_assets_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX work_order_assets_version_idx ON public.work_order_assets USING btree (group_id, version);


--
-- Name: work_order_assets_wo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_order_assets_wo_idx ON public.work_order_assets USING btree (work_order_id, status);


--
-- Name: work_order_comments_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_order_comments_idx ON public.work_order_comments USING btree (asset_id, created_at);


--
-- Name: work_order_messages_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_order_messages_idx ON public.work_order_messages USING btree (work_order_id, scope, created_at);


--
-- Name: work_order_submissions_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX work_order_submissions_idx ON public.work_order_submissions USING btree (work_order_id, round);


--
-- Name: work_order_versions_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX work_order_versions_idx ON public.work_order_versions USING btree (work_order_id, version);


--
-- Name: work_orders_buyer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_buyer_idx ON public.work_orders USING btree (buyer_agency_id, status);


--
-- Name: work_orders_contract_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_contract_idx ON public.work_orders USING btree (contract_id);


--
-- Name: work_orders_supplier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_supplier_idx ON public.work_orders USING btree (supplier_agency_id, status);


--
-- Name: work_quotes_inquiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_quotes_inquiry_idx ON public.work_quotes USING btree (inquiry_id, status);


--
-- Name: work_quotes_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX work_quotes_version_idx ON public.work_quotes USING btree (inquiry_id, supplier_agency_id, version);


--
-- Name: contracts contracts_freeze_signatures; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contracts_freeze_signatures BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.sawwiq_freeze_signatures();


--
-- Name: conversation_messages conversation_messages_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER conversation_messages_append_only BEFORE DELETE OR UPDATE ON public.conversation_messages FOR EACH ROW EXECUTE FUNCTION public.sawwiq_chat_append_only();


--
-- Name: escrow_ledger escrow_ledger_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER escrow_ledger_append_only BEFORE DELETE OR UPDATE ON public.escrow_ledger FOR EACH ROW EXECUTE FUNCTION public.sawwiq_ledger_append_only();


--
-- Name: milestone_shares milestone_shares_frozen; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER milestone_shares_frozen BEFORE DELETE OR UPDATE ON public.milestone_shares FOR EACH ROW EXECUTE FUNCTION public.milestone_shares_frozen();


--
-- Name: ndas ndas_freeze_signatures; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ndas_freeze_signatures BEFORE UPDATE ON public.ndas FOR EACH ROW EXECUTE FUNCTION public.sawwiq_freeze_signatures();


--
-- Name: work_order_versions work_order_versions_frozen_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER work_order_versions_frozen_trg BEFORE DELETE OR UPDATE ON public.work_order_versions FOR EACH ROW EXECUTE FUNCTION public.work_order_versions_frozen();


--
-- Name: agencies agencies_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: app_settings app_settings_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: availability_windows availability_windows_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_windows
    ADD CONSTRAINT availability_windows_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: cancellation_proposals cancellation_proposals_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_proposals
    ADD CONSTRAINT cancellation_proposals_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: capacity_reservations capacity_reservations_provider_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_reservations
    ADD CONSTRAINT capacity_reservations_provider_agency_id_agencies_id_fk FOREIGN KEY (provider_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: capacity_reservations capacity_reservations_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_reservations
    ADD CONSTRAINT capacity_reservations_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: collab_ai_usage collab_ai_usage_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_ai_usage
    ADD CONSTRAINT collab_ai_usage_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_blocks collab_blocks_blocked_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_blocks
    ADD CONSTRAINT collab_blocks_blocked_agency_id_agencies_id_fk FOREIGN KEY (blocked_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_blocks collab_blocks_blocker_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_blocks
    ADD CONSTRAINT collab_blocks_blocker_agency_id_agencies_id_fk FOREIGN KEY (blocker_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_feedback collab_feedback_about_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_feedback
    ADD CONSTRAINT collab_feedback_about_agency_id_agencies_id_fk FOREIGN KEY (about_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_feedback collab_feedback_author_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_feedback
    ADD CONSTRAINT collab_feedback_author_agency_id_agencies_id_fk FOREIGN KEY (author_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_feedback collab_feedback_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_feedback
    ADD CONSTRAINT collab_feedback_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: collab_invites collab_invites_accepted_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_invites
    ADD CONSTRAINT collab_invites_accepted_agency_id_agencies_id_fk FOREIGN KEY (accepted_agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: collab_invites collab_invites_from_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_invites
    ADD CONSTRAINT collab_invites_from_agency_id_agencies_id_fk FOREIGN KEY (from_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_need_replies collab_need_replies_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_need_replies
    ADD CONSTRAINT collab_need_replies_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_need_replies collab_need_replies_need_id_collab_needs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_need_replies
    ADD CONSTRAINT collab_need_replies_need_id_collab_needs_id_fk FOREIGN KEY (need_id) REFERENCES public.collab_needs(id) ON DELETE CASCADE;


--
-- Name: collab_needs collab_needs_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_needs
    ADD CONSTRAINT collab_needs_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_plans collab_plans_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_plans
    ADD CONSTRAINT collab_plans_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_prefs collab_prefs_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_prefs
    ADD CONSTRAINT collab_prefs_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_profiles collab_profiles_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_profiles
    ADD CONSTRAINT collab_profiles_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_roster collab_roster_owner_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_roster
    ADD CONSTRAINT collab_roster_owner_agency_id_agencies_id_fk FOREIGN KEY (owner_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: collab_roster collab_roster_provider_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collab_roster
    ADD CONSTRAINT collab_roster_provider_agency_id_agencies_id_fk FOREIGN KEY (provider_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: contract_changes contract_changes_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_changes
    ADD CONSTRAINT contract_changes_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_events contract_events_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_events
    ADD CONSTRAINT contract_events_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_requests contract_requests_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_requests
    ADD CONSTRAINT contract_requests_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: contract_requests contract_requests_from_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_requests
    ADD CONSTRAINT contract_requests_from_agency_id_agencies_id_fk FOREIGN KEY (from_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: contract_requests contract_requests_to_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_requests
    ADD CONSTRAINT contract_requests_to_agency_id_agencies_id_fk FOREIGN KEY (to_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_client_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_client_agency_id_agencies_id_fk FOREIGN KEY (client_agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_package_id_packages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_package_id_packages_id_fk FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_proposal_id_proposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_proposal_id_proposals_id_fk FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_request_id_project_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_request_id_project_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;


--
-- Name: conversation_messages conversation_messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_messages conversation_messages_hidden_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_hidden_by_users_id_fk FOREIGN KEY (hidden_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversation_messages conversation_messages_sender_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_sender_user_id_users_id_fk FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_inquiry_id_inquiries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_inquiry_id_inquiries_id_fk FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_proposal_id_proposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_proposal_id_proposals_id_fk FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_request_id_project_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_request_id_project_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;


--
-- Name: dispute_evidence dispute_evidence_dispute_id_milestone_disputes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispute_evidence
    ADD CONSTRAINT dispute_evidence_dispute_id_milestone_disputes_id_fk FOREIGN KEY (dispute_id) REFERENCES public.milestone_disputes(id) ON DELETE CASCADE;


--
-- Name: error_events error_events_resolved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_events
    ADD CONSTRAINT error_events_resolved_by_users_id_fk FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: escrow_ledger escrow_ledger_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE RESTRICT;


--
-- Name: escrow_ledger escrow_ledger_milestone_id_milestones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_milestone_id_milestones_id_fk FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE SET NULL;


--
-- Name: escrow_ledger escrow_ledger_payee_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrow_ledger
    ADD CONSTRAINT escrow_ledger_payee_agency_id_agencies_id_fk FOREIGN KEY (payee_agency_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;


--
-- Name: events events_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: events events_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- Name: follows follows_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: inquiries inquiries_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: inquiries inquiries_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- Name: likes likes_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: milestone_checks milestone_checks_milestone_id_milestones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_checks
    ADD CONSTRAINT milestone_checks_milestone_id_milestones_id_fk FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;


--
-- Name: milestone_disputes milestone_disputes_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: milestone_disputes milestone_disputes_decided_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_decided_by_users_id_fk FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: milestone_disputes milestone_disputes_milestone_id_milestones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_milestone_id_milestones_id_fk FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;


--
-- Name: milestone_shares milestone_shares_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_shares
    ADD CONSTRAINT milestone_shares_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;


--
-- Name: milestone_shares milestone_shares_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_shares
    ADD CONSTRAINT milestone_shares_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE RESTRICT;


--
-- Name: milestone_shares milestone_shares_milestone_id_milestones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_shares
    ADD CONSTRAINT milestone_shares_milestone_id_milestones_id_fk FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE RESTRICT;


--
-- Name: milestone_shares milestone_shares_partner_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_shares
    ADD CONSTRAINT milestone_shares_partner_agency_id_agencies_id_fk FOREIGN KEY (partner_agency_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;


--
-- Name: milestones milestones_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: ndas ndas_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ndas
    ADD CONSTRAINT ndas_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_request_id_project_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_request_id_project_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;


--
-- Name: owner_matches owner_matches_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_matches
    ADD CONSTRAINT owner_matches_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: owner_matches owner_matches_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_matches
    ADD CONSTRAINT owner_matches_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: owner_needs owner_needs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_needs
    ADD CONSTRAINT owner_needs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: packages packages_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: partner_requests partner_requests_from_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_requests
    ADD CONSTRAINT partner_requests_from_agency_id_agencies_id_fk FOREIGN KEY (from_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: partner_requests partner_requests_to_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_requests
    ADD CONSTRAINT partner_requests_to_agency_id_agencies_id_fk FOREIGN KEY (to_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: payment_events payment_events_payment_id_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_payment_id_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


--
-- Name: payments payments_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: payments payments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pioneer_invitations pioneer_invitations_claimed_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_claimed_agency_id_agencies_id_fk FOREIGN KEY (claimed_agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: pioneer_invitations pioneer_invitations_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pioneer_invitations pioneer_invitations_prospect_id_prospects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pioneer_invitations
    ADD CONSTRAINT pioneer_invitations_prospect_id_prospects_id_fk FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE SET NULL;


--
-- Name: portfolio_clients portfolio_clients_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_clients
    ADD CONSTRAINT portfolio_clients_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: portfolio_setup_media portfolio_setup_media_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_setup_media
    ADD CONSTRAINT portfolio_setup_media_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: portfolio_setups portfolio_setups_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_setups
    ADD CONSTRAINT portfolio_setups_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: portfolio_setups portfolio_setups_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_setups
    ADD CONSTRAINT portfolio_setups_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- Name: portfolio_setups portfolio_setups_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_setups
    ADD CONSTRAINT portfolio_setups_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: post_images post_images_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: posts posts_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: posts posts_client_id_portfolio_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_client_id_portfolio_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.portfolio_clients(id) ON DELETE SET NULL;


--
-- Name: profile_publications profile_publications_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_publications
    ADD CONSTRAINT profile_publications_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: promotions promotions_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_request_id_project_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_request_id_project_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.project_requests(id) ON DELETE CASCADE;


--
-- Name: prospects prospects_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: prospects prospects_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referral_agents referral_agents_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_agents
    ADD CONSTRAINT referral_agents_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referral_agents referral_agents_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_agents
    ADD CONSTRAINT referral_agents_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: referral_payouts referral_payouts_agent_id_referral_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_payouts
    ADD CONSTRAINT referral_payouts_agent_id_referral_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.referral_agents(id) ON DELETE RESTRICT;


--
-- Name: referral_payouts referral_payouts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_payouts
    ADD CONSTRAINT referral_payouts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: reports reports_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_users_id_fk FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: request_matches request_matches_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_matches
    ADD CONSTRAINT request_matches_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: request_matches request_matches_request_id_project_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_matches
    ADD CONSTRAINT request_matches_request_id_project_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.project_requests(id) ON DELETE CASCADE;


--
-- Name: review_requests review_requests_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: review_requests review_requests_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_request_id_review_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_request_id_review_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.review_requests(id) ON DELETE SET NULL;


--
-- Name: saves saves_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saves
    ADD CONSTRAINT saves_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: service_tags service_tags_proposed_by_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags
    ADD CONSTRAINT service_tags_proposed_by_agency_id_agencies_id_fk FOREIGN KEY (proposed_by_agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: service_tags service_tags_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags
    ADD CONSTRAINT service_tags_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: social_grants social_grants_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_grants
    ADD CONSTRAINT social_grants_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: social_grants social_grants_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_grants
    ADD CONSTRAINT social_grants_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: social_import_items social_import_items_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_import_items
    ADD CONSTRAINT social_import_items_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: social_import_items social_import_items_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_import_items
    ADD CONSTRAINT social_import_items_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- Name: social_import_items social_import_items_resource_id_social_resources_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_import_items
    ADD CONSTRAINT social_import_items_resource_id_social_resources_id_fk FOREIGN KEY (resource_id) REFERENCES public.social_resources(id) ON DELETE CASCADE;


--
-- Name: social_oauth_attempts social_oauth_attempts_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_oauth_attempts
    ADD CONSTRAINT social_oauth_attempts_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: social_oauth_attempts social_oauth_attempts_client_id_portfolio_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_oauth_attempts
    ADD CONSTRAINT social_oauth_attempts_client_id_portfolio_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.portfolio_clients(id) ON DELETE SET NULL;


--
-- Name: social_oauth_attempts social_oauth_attempts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_oauth_attempts
    ADD CONSTRAINT social_oauth_attempts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: social_resources social_resources_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_resources
    ADD CONSTRAINT social_resources_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: social_resources social_resources_client_id_portfolio_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_resources
    ADD CONSTRAINT social_resources_client_id_portfolio_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.portfolio_clients(id) ON DELETE SET NULL;


--
-- Name: social_resources social_resources_grant_id_social_grants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_resources
    ADD CONSTRAINT social_resources_grant_id_social_grants_id_fk FOREIGN KEY (grant_id) REFERENCES public.social_grants(id) ON DELETE CASCADE;


--
-- Name: support_requests support_requests_handled_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_handled_by_users_id_fk FOREIGN KEY (handled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_requests support_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: work_inquiries work_inquiries_buyer_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiries
    ADD CONSTRAINT work_inquiries_buyer_agency_id_agencies_id_fk FOREIGN KEY (buyer_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_inquiries work_inquiries_contract_request_id_contract_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiries
    ADD CONSTRAINT work_inquiries_contract_request_id_contract_requests_id_fk FOREIGN KEY (contract_request_id) REFERENCES public.contract_requests(id) ON DELETE SET NULL;


--
-- Name: work_inquiries work_inquiries_need_id_collab_needs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiries
    ADD CONSTRAINT work_inquiries_need_id_collab_needs_id_fk FOREIGN KEY (need_id) REFERENCES public.collab_needs(id) ON DELETE SET NULL;


--
-- Name: work_inquiries work_inquiries_parent_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiries
    ADD CONSTRAINT work_inquiries_parent_contract_id_contracts_id_fk FOREIGN KEY (parent_contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: work_inquiry_recipients work_inquiry_recipients_inquiry_id_work_inquiries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiry_recipients
    ADD CONSTRAINT work_inquiry_recipients_inquiry_id_work_inquiries_id_fk FOREIGN KEY (inquiry_id) REFERENCES public.work_inquiries(id) ON DELETE CASCADE;


--
-- Name: work_inquiry_recipients work_inquiry_recipients_supplier_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_inquiry_recipients
    ADD CONSTRAINT work_inquiry_recipients_supplier_agency_id_agencies_id_fk FOREIGN KEY (supplier_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_order_assets work_order_assets_uploaded_by_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_assets
    ADD CONSTRAINT work_order_assets_uploaded_by_agency_id_agencies_id_fk FOREIGN KEY (uploaded_by_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_order_assets work_order_assets_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_assets
    ADD CONSTRAINT work_order_assets_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_order_comments work_order_comments_asset_id_work_order_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_comments
    ADD CONSTRAINT work_order_comments_asset_id_work_order_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.work_order_assets(id) ON DELETE CASCADE;


--
-- Name: work_order_comments work_order_comments_author_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_comments
    ADD CONSTRAINT work_order_comments_author_agency_id_agencies_id_fk FOREIGN KEY (author_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_order_messages work_order_messages_author_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_messages
    ADD CONSTRAINT work_order_messages_author_agency_id_agencies_id_fk FOREIGN KEY (author_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_order_messages work_order_messages_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_messages
    ADD CONSTRAINT work_order_messages_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_order_submissions work_order_submissions_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_submissions
    ADD CONSTRAINT work_order_submissions_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_order_versions work_order_versions_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_versions
    ADD CONSTRAINT work_order_versions_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_orders work_orders_buyer_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_buyer_agency_id_agencies_id_fk FOREIGN KEY (buyer_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_orders work_orders_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_inquiry_id_work_inquiries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_inquiry_id_work_inquiries_id_fk FOREIGN KEY (inquiry_id) REFERENCES public.work_inquiries(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_milestone_id_milestones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_milestone_id_milestones_id_fk FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_parent_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_parent_contract_id_contracts_id_fk FOREIGN KEY (parent_contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: work_orders work_orders_supplier_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_supplier_agency_id_agencies_id_fk FOREIGN KEY (supplier_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: work_quotes work_quotes_inquiry_id_work_inquiries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_quotes
    ADD CONSTRAINT work_quotes_inquiry_id_work_inquiries_id_fk FOREIGN KEY (inquiry_id) REFERENCES public.work_inquiries(id) ON DELETE CASCADE;


--
-- Name: work_quotes work_quotes_supplier_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_quotes
    ADD CONSTRAINT work_quotes_supplier_agency_id_agencies_id_fk FOREIGN KEY (supplier_agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: profile_publications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_publications ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



-- Drizzle migration ledger (so db:migrate is a no-op).
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (1, '71e206b3f643a00797c4294c0da68111a1563de0965b98f1fc4bd8205d9a787a', 1790175414704) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (2, '33a5ef4996efd55a888bde879dd641ad099343e29b478dcb1dfcb2dcb3c54148', 1790178428099) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (3, '9f3e8a83e77046b9c027c34de6f987d04df65dbd72ecd21a65302ab85ecf544e', 1790238571473) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (4, '98cb2193c0fe357ed3b4b9de041a5b6e8c257f51921adbe562f4f82edc50059d', 1790240573497) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (5, '028b4537e6fe6223a940dde625e1614b66191655e0b69d44ceb5a38dd2fae324', 1790247724475) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (6, 'f25dabc8b141a2592b5802d801cb2d1f9c1a8fb1d19e019befb18226ee6d7677', 1790263660318) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (7, 'e085a13b923ca7d29bb7003ed45c15046820d502c2278b2a0300095ee6f3f5ec', 1790264956179) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (8, '72171ae497c1aded7c5e8edc65a6509606dc1d11abafc940a9d2bf7a075f3f8f', 1790266518855) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (9, '39c13b21417c6872c661ffd819d81abf3711eccfbc686e6298f933a7569ec642', 1790268790814) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (10, 'c0f2990259d5403d5b4d9a2b07bf27faa3c5bce8a35d00f9193ce5261b119f08', 1790338124777) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (11, '51e61b7ce6574fef84f5fbae9f8c6413149cef0b7ae3b32ebf1df5ca73077e3b', 1790345109202) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (12, 'fc85bb142eb18c7167d6154e705afc3c0473e599b229dd9e88397276857ad5c7', 1790351192985) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (13, '35f7b01bfccf73c18eb37b193b5ac841aaa7b0b84f65ec68d7166074c442b9ce', 1790356379833) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (14, '665b96c625d5073c54a8affe3f91d71691840e81582d89f4617e5b400392d185', 1790412540179) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (15, '1aba34b042079f6f89b3dbc3d4bb72280c7a3f4ca04ac315e1838919d1667cb9', 1790433561880) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (16, '2af366dd23b8c68412cdbb3d6933ec5c2f1885ef071290f8ab262b05fcab08ac', 1790442709117) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (17, '569b8a25647e8e47790a36287547ac37070fe93518974b98209ac5b971b064a8', 1790448362542) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (18, '4bf01cf55e831dca573d266c6d5b93382ab2c4e325ced631f98a7fcc4dc5df6f', 1790449686686) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (19, 'fcdc0afd3ffd9b0c21aa406d42efc03151cd7b64911b8317579747a0edd4f730', 1790450299679) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (20, '0b85ea57ff8553b3f021d385310a32d10cbdb38f4e7b8d5039e82db4e97beef7', 1790501607945) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (21, 'ecdb305f913cfaa19e33f5f47612136df6a40fa9f9b7d7f6e696332f90b21299', 1790501667945) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (22, '2c37c80850fe36a20db989a0bc5acd2b5aeb4f46f97e2cb5c5580b6aee7ba7a8', 1790501727945) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (23, 'e8e49f2bd9ed007cf3f23dbe67f720c9e4fa4e3635210c32d57ff592265ce0af', 1790544618803) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (24, 'cf79666d84eefd8b20cd55569f1282f1b143977b256cd660f8fbbcb20ace57aa', 1790548022310) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (25, '70aa1705a3b595e3bb3ffe4f7fd5073614a91c98808def62bbd8a47a0898aee9', 1790553988005) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (26, '605065eef79580d35c5e14b347141705fe9763d688d4ffba152cf94d0b3c38ca', 1790563158568) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (27, '552a92d6e253baa461e42086967e7f273bff3241ce8c35edd0f34bad2f54f886', 1790583000793) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (28, 'cadad9bb078e82fefaaa38c2e10494a9f148e17f9e6b86d0f76c072275ba8675', 1790614167350) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (29, 'db32d2f1b94c7008b2894b941e06ad7d157a80aefacd11868bfc005dcaccf295', 1790688824180) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (30, '638accafc873c94738d070bf5072cf3b2533128bf8eb044d5cbe3ce5bdc4ec23', 1790690816768) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (31, '7da2dccb47096835ed2eb7132ee9cd92eee88f22a25caba573bc8028134dadc2', 1790853277682) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (32, '24b2d8cf7292881801af9ee57b7230dc4757148fa1eafc3311e34538ab1e92e4', 1790876336771) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (33, 'bfb3ef3b2c7302a7d754b16b85215c00dd5310382211b38e95333c8a128dd711', 1790931476187) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (34, '378aa20adc54bf4f3ba735f2bba39df38704b28a7c205120799c33cb00e18d35', 1790938107291) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (35, '30c8a340c790a16d7dfc94d6c333abc2d4fbf93ff403149821b8e5adb3bf7d13', 1791048269569) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (36, '72587aa5cb3272917853638fb2056cc4c0fee52a9c314fd979392b6253882581', 1791053835931) ON CONFLICT DO NOTHING;
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (37, '75904d483b9a91c9cc949bb412ca3868dd0db9b99729f01fda0e0487b95c80d1', 1791104509479) ON CONFLICT DO NOTHING;
SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 37, true);
