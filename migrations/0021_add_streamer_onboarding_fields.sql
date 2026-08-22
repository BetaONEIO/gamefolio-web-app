-- Streamer onboarding collected a main game and a stream frequency and then
-- discarded both — completeOnboarding() only ever wrote them into the bio
-- string. Give them columns so the answers survive, alongside the existing
-- stream_platform / stream_channel_name fields.
--
-- Deliberately no verified flag here: verification is only ever granted by the
-- OAuth callbacks in server/routes/social-oauth.ts, never by anything a user
-- types into a form.

ALTER TABLE users ADD COLUMN IF NOT EXISTS stream_main_game text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stream_frequency text;
