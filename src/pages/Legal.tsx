import { Link } from "react-router-dom";
import jogbookLogo from "@/assets/jogbook-logo.png";

const UPDATED = "7 October 2026";
const CONTACT = "hello@jogbook.com";

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to="/"><img src={jogbookLogo} alt="jogbook" className="h-8 w-auto" /></Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6 text-sm leading-relaxed">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">Last updated: {UPDATED}</p>
        </div>
        <div className="space-y-5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <LegalLinks />
      </main>
    </div>
  );
}

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      <Link to="/terms" className="hover:underline">Terms of Service</Link>
      {" · "}
      <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
    </p>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service">
      <p>These terms govern your use of JogBook ("we", "us"), a platform that lets DJs publish profiles and receive booking requests from clients and promoters ("bookers").</p>
      <h2>1. Accounts</h2>
      <p>You must provide accurate information and keep your login secure. You are responsible for activity on your account. You must be at least 18 years old.</p>
      <h2>2. What JogBook does</h2>
      <p>JogBook is a listing and request tool. A booking request is an enquiry, not a contract. Any agreement on fees, dates, deposits and performance is made directly between the DJ and the booker.</p>
      <h2>3. Payments</h2>
      <p>Payments are currently not processed through JogBook. DJs and bookers arrange payment directly and at their own risk. If we introduce in-platform payments, additional terms (including any service fee) will apply and be shown before you pay.</p>
      <h2>4. Your content</h2>
      <p>You keep ownership of the photos, mixes, press kits and text you upload. You grant us a licence to display that content on JogBook to operate the service. You must have the rights to everything you upload.</p>
      <h2>5. Acceptable use</h2>
      <ul>
        <li>No spam, fake requests, harassment or impersonation.</li>
        <li>No unlawful, infringing or offensive content.</li>
        <li>No attempts to break, scrape or overload the service.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>
      <h2>6. Liability</h2>
      <p>JogBook is provided "as is". We are not responsible for the conduct of DJs or bookers, cancelled events, or disputes between users. To the extent permitted by law, our liability is limited to the amount you paid us in the last 12 months (currently zero).</p>
      <h2>7. Changes and termination</h2>
      <p>We may update these terms; continued use means you accept the updated terms. You can delete your account at any time.</p>
      <h2>8. Contact</h2>
      <p>Questions: <a className="text-primary hover:underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>This policy explains what personal information JogBook collects and how we use it.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email, password (stored hashed), role, name.</li>
        <li><strong>DJ profiles:</strong> stage name, bio, location, genres, rates, photos, music and social links, press kits. This is public.</li>
        <li><strong>Booker profiles:</strong> name, company/event type, location, phone. Private to you.</li>
        <li><strong>Booking requests:</strong> name, email, phone, event date, type and message. Shared only with the DJ you contact (and visible to you if signed in).</li>
        <li><strong>Technical data:</strong> basic logs needed to run and secure the service.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide the service, deliver booking requests to DJs, send account emails, prevent spam and abuse, and comply with law. We do not sell your personal information.</p>
      <h2>Sharing</h2>
      <p>We use trusted hosting, database and email providers to run JogBook. When you send a booking request, your contact details are shared with that DJ.</p>
      <h2>Retention</h2>
      <p>We keep data while your account is active. DJs can delete booking requests at any time. You can ask us to delete your account and data.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live (including under South Africa's POPIA and the EU/UK GDPR), you may access, correct, delete or object to processing of your data. Contact us to make a request.</p>
      <h2>Security</h2>
      <p>Data is protected with access controls and encrypted connections. No system is perfectly secure.</p>
      <h2>Contact</h2>
      <p><a className="text-primary hover:underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </LegalShell>
  );
}
