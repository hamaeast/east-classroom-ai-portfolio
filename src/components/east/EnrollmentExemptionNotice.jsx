export default function EnrollmentExemptionNotice({ joinedDate }) {
  return <section className="mb-6 rounded-xl border border-muted-foreground/40 bg-muted/50 p-5">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold">Enrollment exemption</h3>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Exempt</span>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">You joined the class on {joinedDate}. Weekly goals, reflections, and check-in grades from earlier weeks are exempt. They are greyed out in your gradebook and do not count as zeros.</p>
  </section>;
}