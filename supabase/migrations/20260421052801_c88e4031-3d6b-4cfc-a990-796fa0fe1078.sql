CREATE POLICY "DJs can delete their booking requests"
ON public.booking_requests
FOR DELETE
USING (is_profile_owner(dj_id));