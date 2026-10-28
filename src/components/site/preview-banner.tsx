/** Shown whenever the site runs on sample data because Supabase isn't connected. */
export function PreviewBanner() {
  return (
    <div className="bg-warn-soft px-4 py-2 text-center text-[0.8125rem] font-medium text-warn">
      Preview mode: sample data, nothing is saved. Connect Supabase to go live.
    </div>
  );
}
